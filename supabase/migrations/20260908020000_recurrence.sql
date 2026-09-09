-- Recorrência de projetos e tarefas: cada linha carrega sua própria regra
-- (jsonb, null = não recorrente) e um `series_id` estável que identifica a
-- série ao longo dos ciclos gerados. Só a instância mais recente de uma série
-- mantém `recurrence` preenchido — ao gerar o próximo ciclo, a instância
-- antiga tem `recurrence` zerado (vira histórico comum) e o novo ciclo herda
-- o mesmo `series_id`.
alter table public.projects add column recurrence jsonb, add column series_id uuid;
alter table public.tasks add column recurrence jsonb, add column series_id uuid;

-- Deduplica gerações concorrentes: dois dispositivos abrindo o app no exato
-- momento em que um ciclo vence calculam a mesma data de aparição de forma
-- determinística, então o segundo insert do mesmo (series_id, created_at)
-- simplesmente falha (o client já trata isso como fire-and-forget).
create unique index projects_series_cycle_unique on public.projects (series_id, created_at) where series_id is not null;
create unique index tasks_series_cycle_unique on public.tasks (series_id, created_at) where series_id is not null;
