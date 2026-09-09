-- Agendamento de notificações para um momento futuro (ex.: fim de um Pomodoro).
-- Diferente de `public.notifications`, que já dispara push imediatamente no
-- insert, estas linhas ficam "adormecidas" até `fire_at`, quando um job
-- pg_cron as promove para `public.notifications` (reaproveitando o trigger de
-- push que já existe ali — nenhuma mudança na Edge Function `send-push`).
create table public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  entity_type text,
  created_at timestamptz not null default now()
);

alter table public.scheduled_notifications enable row level security;

create policy "scheduled_notifications: dono vê" on public.scheduled_notifications
  for select using (user_id = auth.uid());
create policy "scheduled_notifications: dono insere" on public.scheduled_notifications
  for insert with check (user_id = auth.uid());
create policy "scheduled_notifications: dono remove" on public.scheduled_notifications
  for delete using (user_id = auth.uid());

create index scheduled_notifications_fire_at_idx on public.scheduled_notifications (fire_at);

create extension if not exists pg_cron;

-- security definer: precisa inserir em `notifications` para outro "dono"
-- lógico sem contexto de auth.uid() (o cron roda sem sessão de usuário) —
-- mesmo padrão já usado por `notify_push_subscribers`.
create or replace function public.dispatch_scheduled_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, entity_type)
  select user_id, 'system', title, body, entity_type
  from public.scheduled_notifications
  where fire_at <= now();

  delete from public.scheduled_notifications where fire_at <= now();
end;
$$;

-- Granularidade mínima do pg_cron é de 1 minuto — um push agendado pode
-- chegar com até ~1min de atraso em relação ao horário exato.
select cron.schedule('dispatch-scheduled-notifications', '* * * * *', 'select public.dispatch_scheduled_notifications();');
