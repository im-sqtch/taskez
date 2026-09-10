-- Etapa 2 da correção #8: lixeira com soft-delete e restauração para
-- projetos, tarefas e arquivos. Decisões de produto combinadas com o
-- usuário: retenção de 30 dias com auto-purge automático (Edge Function
-- purge-trash + pg_cron, numa migration separada); ao apagar um projeto,
-- suas tarefas entram em soft-delete junto e voltam juntas se o projeto for
-- restaurado — chat sobrevive intacto, só fica inacessível enquanto o
-- projeto não aparece na UI normal, nunca é tocado por esta migration;
-- arquivos NÃO somem (vínculo many-to-many com projetos, vivem numa lista
-- central do workspace, independente de projeto); restaura quem apagou ou o
-- dono do workspace; ninguém antecipa a purga manualmente — sempre espera
-- os 30 dias completos.

alter table public.projects add column deleted_at timestamptz, add column deleted_by uuid references public.profiles (id);
alter table public.tasks add column deleted_at timestamptz, add column deleted_by uuid references public.profiles (id);
alter table public.files add column deleted_at timestamptz, add column deleted_by uuid references public.profiles (id);

create index projects_deleted_at_idx on public.projects (deleted_at) where deleted_at is not null;
create index tasks_deleted_at_idx on public.tasks (deleted_at) where deleted_at is not null;
create index files_deleted_at_idx on public.files (deleted_at) where deleted_at is not null;

-- `files` nunca teve policy de UPDATE — linkFileToProject/unlinkFileFromProject
-- (dataStore.ts) já dependiam de um update que sempre falhava em silêncio (o
-- fireAndForget antigo engolia o erro; ver correção separada desse bug).
-- Aproveitado aqui: qualquer membro pode atualizar (vincular/desvincular de
-- projeto) — a regra mais restrita de soft-delete/restore é imposta dentro
-- das RPCs abaixo, não por esta policy.
create policy "files: membros atualizam" on public.files
  for update using (public.is_workspace_member(workspace_id));

-- ============================================================
-- Projetos: apagar leva as tarefas junto, com o MESMO timestamp — é como
-- restaurar sabe depois quais tarefas reverter junto, e nunca reviver uma
-- tarefa que já estava na lixeira por conta própria antes disso.
-- ============================================================

create or replace function public.soft_delete_project(p_project_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  -- A policy de UPDATE de `projects` (is_workspace_member) é ampla demais
  -- pra esta ação específica — só o dono do workspace pode apagar um
  -- projeto (ver correção "Etapa 1"). A regra certa é imposta aqui.
  if not public.is_workspace_owner((select workspace_id from public.projects where id = p_project_id)) then
    raise exception 'only the workspace owner can delete a project';
  end if;

  update public.projects set deleted_at = v_now, deleted_by = auth.uid() where id = p_project_id and deleted_at is null;
  update public.tasks set deleted_at = v_now, deleted_by = auth.uid() where project_id = p_project_id and deleted_at is null;
end;
$$;

create or replace function public.restore_project(p_project_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_deleted_at timestamptz;
  v_deleted_by uuid;
begin
  select workspace_id, deleted_at, deleted_by into v_workspace_id, v_deleted_at, v_deleted_by
  from public.projects where id = p_project_id;

  if v_deleted_at is null then return; end if;
  if not (v_deleted_by = auth.uid() or public.is_workspace_owner(v_workspace_id)) then
    raise exception 'only who deleted it or the workspace owner can restore';
  end if;

  update public.projects set deleted_at = null, deleted_by = null where id = p_project_id;
  -- Só as tarefas apagadas NA MESMA operação (timestamp idêntico) voltam
  -- junto — uma tarefa já na lixeira por conta própria antes disso continua lá.
  update public.tasks set deleted_at = null, deleted_by = null where project_id = p_project_id and deleted_at = v_deleted_at;
end;
$$;

-- ============================================================
-- Tarefas: qualquer membro do workspace apaga (mantém o modelo colaborativo
-- já existente) — mas não dá pra restaurar uma tarefa cujo projeto também
-- está na lixeira (ela reapareceria "dentro" de um projeto invisível).
-- ============================================================

create or replace function public.soft_delete_task(p_task_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_workspace_member((select workspace_id from public.tasks where id = p_task_id)) then
    raise exception 'not a workspace member';
  end if;
  update public.tasks set deleted_at = now(), deleted_by = auth.uid() where id = p_task_id and deleted_at is null;
end;
$$;

create or replace function public.restore_task(p_task_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_project_id uuid;
  v_deleted_at timestamptz;
  v_deleted_by uuid;
begin
  select workspace_id, project_id, deleted_at, deleted_by into v_workspace_id, v_project_id, v_deleted_at, v_deleted_by
  from public.tasks where id = p_task_id;

  if v_deleted_at is null then return; end if;
  if not (v_deleted_by = auth.uid() or public.is_workspace_owner(v_workspace_id)) then
    raise exception 'only who deleted it or the workspace owner can restore';
  end if;
  if v_project_id is not null and exists (select 1 from public.projects where id = v_project_id and deleted_at is not null) then
    raise exception 'cannot restore a task whose project is still in trash';
  end if;

  update public.tasks set deleted_at = null, deleted_by = null where id = p_task_id;
end;
$$;

-- ============================================================
-- Arquivos: quem enviou ou o dono do workspace apaga (mesma regra da Etapa
-- 1). O blob no Storage é preservado até a purga definitiva (30 dias) —
-- precisa continuar existindo pra o download funcionar se o arquivo for
-- restaurado.
-- ============================================================

create or replace function public.soft_delete_file(p_file_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_uploaded_by uuid;
begin
  select workspace_id, uploaded_by into v_workspace_id, v_uploaded_by from public.files where id = p_file_id;
  if not (v_uploaded_by = auth.uid() or public.is_workspace_owner(v_workspace_id)) then
    raise exception 'only who uploaded it or the workspace owner can delete';
  end if;
  update public.files set deleted_at = now(), deleted_by = auth.uid() where id = p_file_id and deleted_at is null;
end;
$$;

create or replace function public.restore_file(p_file_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_deleted_at timestamptz;
  v_deleted_by uuid;
begin
  select workspace_id, deleted_at, deleted_by into v_workspace_id, v_deleted_at, v_deleted_by from public.files where id = p_file_id;
  if v_deleted_at is null then return; end if;
  if not (v_deleted_by = auth.uid() or public.is_workspace_owner(v_workspace_id)) then
    raise exception 'only who deleted it or the workspace owner can restore';
  end if;
  update public.files set deleted_at = null, deleted_by = null where id = p_file_id;
end;
$$;
