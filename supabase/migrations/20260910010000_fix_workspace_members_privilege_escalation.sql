-- Corrige escalada de privilégio em `workspace_members`: a policy de insert
-- criada em 20260905000200_fix_workspace_bootstrap_rls.sql liberava
-- `is_workspace_member(workspace_id) or is_workspace_creator(workspace_id)`
-- sem travar `user_id` nem `role` — ou seja, qualquer membro comum podia
-- inserir uma linha com role='owner' para si mesmo, ou registrar uma segunda
-- conta sua como 'owner' do workspace (assumindo controle total: remover o
-- dono real, apagar projetos/tarefas/arquivos, expulsar todo mundo).
--
-- A nova policy só permite dois casos, com role fixo em cada um:
--   1) bootstrap: o criador do workspace insere A SI MESMO como 'owner'
--      (não dá pra checar is_workspace_owner aqui — ainda não existe
--      nenhuma linha em workspace_members nesse momento);
--   2) convite: um membro já existente do workspace adiciona outra pessoa,
--      sempre como 'member' — nunca 'owner'.
-- Promover alguém a owner (transferência de titularidade) não é um fluxo
-- que o app expõe hoje; se vier a existir, precisa de policy própria.

drop policy if exists "workspace_members: criador ou membro existente adiciona" on public.workspace_members;

create policy "workspace_members: bootstrap do dono ou convite de membro" on public.workspace_members
  for insert with check (
    (role = 'owner' and user_id = auth.uid() and public.is_workspace_creator(workspace_id))
    or
    (role = 'member' and public.is_workspace_member(workspace_id))
  );
