-- Fecha vetor de phishing via push: a policy de insert em `notifications`
-- ("notifications: dono ou contato insere", em phase2_chat_notifications_files)
-- permitia que qualquer contato (from_user_id/to_user_id em `contacts`, mesmo
-- ainda 'pending') gravasse uma notificação para o outro lado com `title` e
-- `body` INTEIRAMENTE livres. O trigger `notifications_push_trigger`
-- transforma todo insert num push nativo real no celular da vítima, com som,
-- mesmo de app fechado — um contato malicioso podia mandar "Sua senha expirou,
-- toque aqui" com qualquer texto e qualquer entity_type/entity_id.
--
-- Os dois únicos usos legítimos (convite de contato, convite aceito) viram
-- uma RPC security definer com textos fixos montados no servidor — o cliente
-- só escolhe QUAL evento ocorreu, nunca o texto exibido. A policy de insert
-- deixa de aceitar gravação em nome de outro usuário.

create or replace function public.notify_contact_event(p_to_user_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  v_title text;
  v_body text;
begin
  if not exists (
    select 1 from public.contacts c
    where (c.from_user_id = auth.uid() and c.to_user_id = p_to_user_id)
       or (c.to_user_id = auth.uid() and c.from_user_id = p_to_user_id)
  ) then
    raise exception 'not a contact';
  end if;

  select name into from_name from public.profiles where id = auth.uid();

  if p_event = 'invite' then
    v_title := 'Novo convite de contato';
    v_body := coalesce(from_name, 'Alguém') || ' quer te adicionar como contato.';
  elsif p_event = 'accepted' then
    v_title := 'Convite aceito';
    v_body := coalesce(from_name, 'Alguém') || ' aceitou seu convite de contato.';
  else
    raise exception 'invalid event: %', p_event;
  end if;

  insert into public.notifications (user_id, type, title, body)
  values (p_to_user_id, 'team', v_title, v_body);
end;
$$;

revoke all on function public.notify_contact_event(uuid, text) from public;
grant execute on function public.notify_contact_event(uuid, text) to authenticated;

drop policy if exists "notifications: dono ou contato insere" on public.notifications;
create policy "notifications: dono insere" on public.notifications
  for insert with check (user_id = auth.uid());
