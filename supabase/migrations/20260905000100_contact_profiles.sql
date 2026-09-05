-- Permite resolver nome/e-mail/avatar de quem já tem uma relação de contato
-- (pendente ou aceita) com o usuário logado, sem abrir a tabela profiles inteira.
create or replace function public.get_contact_profiles(p_ids uuid[])
returns table (id uuid, name text, email text, avatar_color text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.email, p.avatar_color
  from public.profiles p
  where p.id = any(p_ids)
    and exists (
      select 1 from public.contacts c
      where (c.from_user_id = auth.uid() and c.to_user_id = p.id)
         or (c.to_user_id = auth.uid() and c.from_user_id = p.id)
    );
$$;
