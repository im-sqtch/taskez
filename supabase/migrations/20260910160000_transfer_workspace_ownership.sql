-- Transferência de titularidade de workspace — não existia nenhum fluxo pra
-- isso (só o bootstrap automático ao criar a workspace grava role='owner').
-- Sem isso, o dono não tinha como "só sair" da própria workspace nem apagar
-- a conta enquanto ainda fosse dono de uma workspace com outras pessoas.
--
-- "Dono" hoje é definido por DUAS colunas que precisam mudar juntas, atomi-
-- camente, ou ficam inconsistentes: `workspace_members.role = 'owner'`
-- (usada por is_workspace_owner() — remover membro, apagar projeto/arquivo,
-- restaurar da lixeira) e `workspaces.created_by` (usada pela policy de
-- DELETE da própria workspace, "workspaces: criador remove"). `security
-- definer`: não existe policy de UPDATE em workspace_members (nunca foi
-- necessária até agora) — a checagem de permissão é feita aqui dentro, não
-- por uma policy genérica.

create or replace function public.transfer_workspace_ownership(p_workspace_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_owner_name text;
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'only the current owner can transfer ownership';
  end if;
  if p_new_owner_id = auth.uid() then
    raise exception 'already the owner';
  end if;
  if not exists (select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_new_owner_id) then
    raise exception 'target user is not a member of this workspace';
  end if;

  update public.workspace_members set role = 'member' where workspace_id = p_workspace_id and user_id = auth.uid();
  update public.workspace_members set role = 'owner' where workspace_id = p_workspace_id and user_id = p_new_owner_id;
  update public.workspaces set created_by = p_new_owner_id where id = p_workspace_id;

  select name into v_new_owner_name from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, type, title, body, workspace_id)
  values (
    p_new_owner_id,
    'workspace.ownership_transferred',
    'Você agora é dono(a) desta workspace',
    coalesce(v_new_owner_name, 'Alguém') || ' transferiu a titularidade da workspace para você.',
    p_workspace_id
  );
end;
$$;

revoke all on function public.transfer_workspace_ownership(uuid, uuid) from public;
grant execute on function public.transfer_workspace_ownership(uuid, uuid) to authenticated;
