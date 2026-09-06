-- Web Push: cada dispositivo/navegador em que o usuário concede permissão de
-- notificação salva uma assinatura aqui (endpoint + chaves públicas do
-- navegador). Quando uma notificação é inserida, um trigger chama a Edge
-- Function "send-push", que usa essas assinaturas para empurrar a notificação
-- de verdade ao SO (com som), mesmo com o app fechado.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: dono vê" on public.push_subscriptions
  for select using (user_id = auth.uid());
create policy "push_subscriptions: dono insere" on public.push_subscriptions
  for insert with check (user_id = auth.uid());
create policy "push_subscriptions: dono atualiza" on public.push_subscriptions
  for update using (user_id = auth.uid());
create policy "push_subscriptions: dono remove" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- pg_net permite chamar HTTP a partir de um trigger de banco, sem bloquear a
-- transação (a chamada é enfileirada de forma assíncrona).
create extension if not exists pg_net;

-- O segredo compartilhado usado para autenticar essa chamada (guardado no
-- Vault, não neste arquivo) é criado separadamente com:
--   select vault.create_secret('<valor>', 'push_trigger_secret');
create or replace function public.notify_push_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  trigger_secret text;
begin
  select decrypted_secret into trigger_secret from vault.decrypted_secrets where name = 'push_trigger_secret';
  if trigger_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://fzidlcmkwjamuhsjacnd.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', trigger_secret),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'title', new.title,
      'body', new.body,
      'entity_type', new.entity_type,
      'entity_id', new.entity_id,
      'notification_id', new.id
    )
  );
  return new;
end;
$$;

create trigger notifications_push_trigger
  after insert on public.notifications
  for each row execute function public.notify_push_subscribers();
