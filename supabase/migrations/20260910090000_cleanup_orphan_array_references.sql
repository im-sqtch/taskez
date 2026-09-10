-- Fecha buracos de integridade referencial nos arrays uuid[] sem FK própria
-- (tasks.assignee_ids, projects.member_ids, files.project_ids — introduzidos
-- nas migrations task_multi_assignee/file_multi_project_links em vez de
-- tabelas de junção). Hoje a limpeza desses arrays quando o "pai"
-- referenciado é removido depende inteiramente do client (fireAndForget, em
-- dataStore.ts) — se essa escrita falhar, ou se o membro/projeto for
-- removido por OUTRA sessão que nunca chega a tocar nesses arrays, sobram
-- ids órfãos apontando para nada.
--
-- Versão mínima: não migra para tabelas de junção com FK própria (mudaria o
-- formato dos dados e a UI que os lê) — em vez disso, garante a limpeza NO
-- BANCO via trigger, que roda sempre, na mesma transação do delete,
-- independente do client ter feito sua parte ou não. `security definer`: a
-- limpeza é uma garantia de integridade do sistema, não uma ação do usuário
-- — não deve depender da policy de UPDATE das tabelas afetadas.

create or replace function public.cleanup_team_member_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tasks set assignee_ids = array_remove(assignee_ids, old.id) where old.id = any(assignee_ids);
  update public.projects set member_ids = array_remove(member_ids, old.id) where old.id = any(member_ids);
  return old;
end;
$$;

create trigger team_members_cleanup_references
  after delete on public.team_members
  for each row execute function public.cleanup_team_member_references();

create or replace function public.cleanup_project_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.files set project_ids = array_remove(project_ids, old.id) where old.id = any(project_ids);
  return old;
end;
$$;

create trigger projects_cleanup_references
  after delete on public.projects
  for each row execute function public.cleanup_project_references();

-- Backfill: limpa ids órfãos já acumulados antes desta correção (ex.:
-- membros/projetos removidos no passado cuja limpeza pelo client falhou
-- silenciosamente — o fireAndForget antigo engolia o erro, ver correção
-- separada desse mesmo bug).
update public.tasks t
set assignee_ids = coalesce(
  (select array_agg(id) from unnest(t.assignee_ids) as id where exists (select 1 from public.team_members m where m.id = id)),
  '{}'
)
where exists (select 1 from unnest(t.assignee_ids) as id where not exists (select 1 from public.team_members m where m.id = id));

update public.projects p
set member_ids = coalesce(
  (select array_agg(id) from unnest(p.member_ids) as id where exists (select 1 from public.team_members m where m.id = id)),
  '{}'
)
where exists (select 1 from unnest(p.member_ids) as id where not exists (select 1 from public.team_members m where m.id = id));

update public.files f
set project_ids = coalesce(
  (select array_agg(id) from unnest(f.project_ids) as id where exists (select 1 from public.projects pr where pr.id = id)),
  '{}'
)
where exists (select 1 from unnest(f.project_ids) as id where not exists (select 1 from public.projects pr where pr.id = id));
