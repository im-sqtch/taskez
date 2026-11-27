-- Duração e lembretes nas tarefas.
--
-- duration_minutes: duração opcional a partir de due_time (o término é
--   due_time + duração). Sem ela, a grade de horas usa um bloco de 30 min.
-- reminder_minutes: lembrete por push N minutos antes do horário (0 = no
--   horário). Só vale para tarefas com due_time.
-- created_by: quem criou a tarefa — recebe o lembrete quando a tarefa não
--   tem responsável com conta.
alter table public.tasks
  add column duration_minutes integer check (duration_minutes between 5 and 1440),
  add column reminder_minutes integer check (reminder_minutes between 0 and 10080),
  add column created_by uuid references public.profiles (id) on delete set null default auth.uid();

-- Lembretes agendados passam a apontar para a tarefa (o clique no push abre
-- a tarefa) e para o workspace (a notificação aparece no workspace certo).
alter table public.scheduled_notifications
  add column workspace_id uuid references public.workspaces (id) on delete cascade,
  add column entity_id uuid;

create index scheduled_notifications_entity_idx on public.scheduled_notifications (entity_type, entity_id);

create or replace function public.dispatch_scheduled_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with fired as (
    delete from public.scheduled_notifications
    where fire_at <= now()
    returning user_id, workspace_id, title, body, entity_type, entity_id
  )
  insert into public.notifications (user_id, workspace_id, type, title, body, entity_type, entity_id)
  select user_id, workspace_id, case when entity_type = 'task' then 'task' else 'system' end, title, body, entity_type, entity_id
  from fired;
end;
$$;

-- O fuso do perfil é um offset fixo no formato do app ("UTC", "UTC-3",
-- "UTC+5"). Não dá para usar `at time zone` direto: no Postgres "UTC-3" segue
-- a convenção POSIX e significa 3 horas A LESTE de UTC.
create or replace function public.profile_utc_offset_hours(tz text)
returns integer
language sql
immutable
as $$
  select case when tz ~ '^UTC[+-][0-9]{1,2}$' then substring(tz from 4)::integer else 0 end
$$;

-- Recalcula os lembretes de uma tarefa sempre que algo que os afeta muda.
-- Quem recebe: os responsáveis que têm conta; se não houver, quem criou a
-- tarefa (ou, em tarefas antigas sem criador, quem está salvando agora).
create or replace function public.sync_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  due_day date;
  due_at_local timestamp;
  when_text text;
begin
  delete from public.scheduled_notifications where entity_type = 'task' and entity_id = new.id;

  if new.reminder_minutes is null or new.due_date is null or new.due_time is null
     or new.status = 'done' or new.deleted_at is not null then
    return new;
  end if;

  due_day := (new.due_date at time zone 'UTC')::date;
  due_at_local := due_day + new.due_time::time;
  when_text := case
    when new.reminder_minutes = 0 then 'Está na hora (' || new.due_time || ').'
    when new.reminder_minutes < 60 then 'Em ' || new.reminder_minutes || ' min, às ' || new.due_time || '.'
    when new.reminder_minutes = 1440 then 'Amanhã, às ' || new.due_time || '.'
    when new.reminder_minutes % 60 = 0 then 'Em ' || (new.reminder_minutes / 60) || ' h, às ' || new.due_time || '.'
    else 'Às ' || new.due_time || '.'
  end;

  insert into public.scheduled_notifications (user_id, workspace_id, fire_at, title, body, entity_type, entity_id)
  select recipient.user_id, new.workspace_id, recipient.fire_at, 'Lembrete: ' || new.title, when_text, 'task', new.id
  from (
    select p.id as user_id,
           (due_at_local - make_interval(hours => public.profile_utc_offset_hours(p.timezone)) - make_interval(mins => new.reminder_minutes)) at time zone 'UTC' as fire_at
    from public.profiles p
    where p.id in (
      select tm.linked_user_id from public.team_members tm
      where tm.id = any(new.assignee_ids) and tm.linked_user_id is not null
      union
      select coalesce(new.created_by, auth.uid())
      where not exists (
        select 1 from public.team_members tm
        where tm.id = any(new.assignee_ids) and tm.linked_user_id is not null
      )
    )
  ) recipient
  where recipient.fire_at > now();

  return new;
end;
$$;

create trigger tasks_sync_reminders
  after insert or update of title, due_date, due_time, reminder_minutes, status, deleted_at, assignee_ids, workspace_id
  on public.tasks
  for each row execute function public.sync_task_reminders();

create or replace function public.delete_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.scheduled_notifications where entity_type = 'task' and entity_id = old.id;
  return old;
end;
$$;

create trigger tasks_delete_reminders
  after delete on public.tasks
  for each row execute function public.delete_task_reminders();
