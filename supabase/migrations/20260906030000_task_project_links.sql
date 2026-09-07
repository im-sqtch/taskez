-- Lista livre de links que o usuário pode anexar a uma tarefa ou projeto
-- (ex.: link de um documento, board de design, PR etc.).
alter table public.tasks
  add column links text[] not null default '{}';

alter table public.projects
  add column links text[] not null default '{}';
