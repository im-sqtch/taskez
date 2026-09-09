-- Corrige duas lacunas encontradas no fluxo de contatos/equipe:
--
-- 1) `contacts` não tinha nenhuma trava contra linhas duplicadas para o mesmo
--    par de usuários. Combinado com um cache local que podia ficar
--    desatualizado (ver contactsStore.ts), isso deixava alguém preso sem
--    conseguir reenviar convite. Dedup + índice único fecham essa lacuna no
--    banco (a trava de UX continua existindo no client, mas agora reflete uma
--    garantia real).
-- 2) Não havia como remover um único membro de uma workspace (só excluí-la
--    inteira), o que é pré-requisito para poder excluir um contato que ainda
--    está em alguma equipe. Introduz o conceito de "dono remove qualquer
--    membro, membro comum só sai sozinho".

-- ============================================================
-- 1) Dedup + unique constraint em contacts
-- ============================================================

-- Mantém, por par de usuários, a linha 'accepted' se existir uma, senão a
-- mais recente — e apaga as demais.
with ranked as (
  select
    id,
    row_number() over (
      partition by least(from_user_id, to_user_id), greatest(from_user_id, to_user_id)
      order by (status = 'accepted') desc, created_at desc
    ) as rn
  from public.contacts
)
delete from public.contacts
where id in (select id from ranked where rn > 1);

create unique index contacts_unique_pair
  on public.contacts (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id));

-- ============================================================
-- 2) Remoção de membro de workspace: dono remove qualquer um,
--    membro comum só remove a si mesmo (sair da workspace)
-- ============================================================

create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid() and role = 'owner'
  );
$$;

drop policy if exists "workspace_members: membro sai ou remove outro" on public.workspace_members;
create policy "workspace_members: dono remove qualquer, membro sai" on public.workspace_members
  for delete using (
    public.is_workspace_owner(workspace_id)
    or user_id = auth.uid()
  );

drop policy if exists "team_members: membros removem" on public.team_members;
create policy "team_members: dono remove qualquer, membro remove a si mesmo" on public.team_members
  for delete using (
    public.is_workspace_owner(workspace_id)
    or linked_user_id = auth.uid()
  );
