-- Tables belong to the task content; attachments reuse the workspace file store.
alter table public.tasks
  add column tables jsonb not null default '[]'::jsonb;

alter table public.files
  add column task_ids uuid[] not null default '{}';

create index files_task_ids_idx on public.files using gin (task_ids);
