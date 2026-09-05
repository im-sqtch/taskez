-- A policy de insert em workspace_members checava `created_by` lendo a tabela
-- workspaces via subquery comum — mas a policy de select de workspaces exige já
-- ser membro, criando um paradoxo que bloqueava o próprio criador de se adicionar
-- como primeiro membro. Corrige com uma função security definer (bypassa RLS).

create or replace function public.is_workspace_creator(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces
    where id = ws_id and created_by = auth.uid()
  );
$$;

drop policy if exists "workspace_members: criador ou membro existente adiciona" on public.workspace_members;

create policy "workspace_members: criador ou membro existente adiciona" on public.workspace_members
  for insert with check (
    public.is_workspace_member(workspace_id) or public.is_workspace_creator(workspace_id)
  );
