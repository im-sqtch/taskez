-- Timers do widget de foco passam a pertencer à conta, e não ao dispositivo:
-- antes viviam só no localStorage (`taskez-pomodoro`), então sumiam ao trocar
-- de aparelho/navegador. São pessoais (não dependem de workspace) — por isso a
-- chave é só o user_id. O estado da contagem (em andamento, pausado, tempo
-- restante) também fica aqui, para a sessão continuar em qualquer dispositivo.
create table public.focus_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  total_seconds integer not null check (total_seconds between 60 and 86400),
  seconds_left integer not null check (seconds_left between 0 and 86400),
  running boolean not null default false,
  -- Momento em que a contagem chega a zero (só quando running).
  end_at timestamptz,
  -- Linha em scheduled_notifications do push de conclusão — guardada para
  -- qualquer dispositivo poder cancelar ao pausar/reiniciar/excluir.
  scheduled_id uuid,
  -- Versão incrementada pelo cliente a cada escrita: permite ignorar o eco
  -- (realtime) de escritas antigas do próprio dispositivo.
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint focus_timers_running_has_end check (not running or end_at is not null)
);

create index focus_timers_user_id_idx on public.focus_timers (user_id, created_at);

alter table public.focus_timers enable row level security;

create policy "focus_timers: dono vê" on public.focus_timers
  for select using (user_id = auth.uid());
create policy "focus_timers: dono cria" on public.focus_timers
  for insert with check (user_id = auth.uid());
create policy "focus_timers: dono atualiza" on public.focus_timers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "focus_timers: dono remove" on public.focus_timers
  for delete using (user_id = auth.uid());

-- Mesmo limite do app (MAX_FOCUS_TIMERS), garantido também no banco.
create function public.enforce_focus_timer_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('focus_timers:' || new.user_id::text));
  if (select count(*) from public.focus_timers where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 timers de foco por conta atingido'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger focus_timers_limit
  before insert on public.focus_timers
  for each row execute function public.enforce_focus_timer_limit();

alter publication supabase_realtime add table public.focus_timers;
