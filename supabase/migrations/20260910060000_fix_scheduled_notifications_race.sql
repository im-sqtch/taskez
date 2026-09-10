-- `dispatch_scheduled_notifications` (chamada pelo pg_cron a cada minuto)
-- fazia um INSERT ... SELECT seguido de um DELETE como dois comandos
-- separados. Em READ COMMITTED, uma linha com `fire_at <= now()` inserida
-- entre os dois comandos (ex.: um lembrete de Pomodoro agendado para "agora
-- mesmo") é capturada pelo DELETE mas nunca foi vista pelo INSERT anterior —
-- ela é apagada sem nunca ter sido promovida a `notifications`, e o push
-- correspondente simplesmente não chega.
--
-- Um único CTE (`delete ... returning` alimentando o `insert`) resolve a
-- captura e a remoção das mesmas linhas na mesma instrução, atomicamente —
-- nenhuma linha pode ser inserida "no meio" entre as duas operações.

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
    returning user_id, title, body, entity_type
  )
  insert into public.notifications (user_id, type, title, body, entity_type)
  select user_id, 'system', title, body, entity_type
  from fired;
end;
$$;
