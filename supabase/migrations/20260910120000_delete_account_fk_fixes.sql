-- Correção #11: `deleteAccount` no client nunca apagava nada de verdade — só
-- deslogava o dispositivo (apagar a conta de fato exige service role, que o
-- client não tem). Antes de existir a Edge Function que faz a exclusão real
-- (ver delete-account/index.ts), o hard-delete de `auth.users` já falharia
-- de qualquer forma: `files.uploaded_by`, `team_members.linked_user_id`,
-- `projects.deleted_by`, `tasks.deleted_by` e `files.deleted_by` referenciam
-- `profiles` sem `on delete` — o padrão do Postgres (`NO ACTION`) bloqueia a
-- cascata assim que a pessoa já enviou um arquivo, é um "colega fictício"
-- vinculado, ou apagou algo (lixeira) uma vez sequer.
--
-- Nenhuma dessas colunas precisa continuar apontando pra alguém que não
-- existe mais — o dado que elas anotam (o arquivo, o item na lixeira, a
-- entrada de equipe) sobrevive, só perde a atribuição. Mesmo padrão já usado
-- em chat_messages.author_id (20260910050000). `workspaces.created_by`
-- FICA como está (NO ACTION, intocado) de propósito: pela lógica da Edge
-- Function, nenhuma workspace deveria sobrar apontando pra uma conta
-- apagada — se algum bug deixar uma pra trás, é melhor a exclusão inteira
-- falhar alto (constraint violation) do que silenciosamente corromper o
-- "dono" de uma workspace ativa.

alter table public.files alter column uploaded_by drop not null;
alter table public.files
  drop constraint files_uploaded_by_fkey,
  add constraint files_uploaded_by_fkey foreign key (uploaded_by) references public.profiles (id) on delete set null;

alter table public.team_members
  drop constraint team_members_linked_user_id_fkey,
  add constraint team_members_linked_user_id_fkey foreign key (linked_user_id) references public.profiles (id) on delete set null;

alter table public.projects
  drop constraint projects_deleted_by_fkey,
  add constraint projects_deleted_by_fkey foreign key (deleted_by) references public.profiles (id) on delete set null;

alter table public.tasks
  drop constraint tasks_deleted_by_fkey,
  add constraint tasks_deleted_by_fkey foreign key (deleted_by) references public.profiles (id) on delete set null;

alter table public.files
  drop constraint files_deleted_by_fkey,
  add constraint files_deleted_by_fkey foreign key (deleted_by) references public.profiles (id) on delete set null;
