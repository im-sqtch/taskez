-- Um arquivo pode agora estar relacionado a vários projetos (antes era só um).
-- Guardamos os vínculos como array de uuids em vez de tabela de junção porque a
-- política de RLS de "files" já é decidida pelo workspace_id, não pelo projeto —
-- não há necessidade de FK/joins para aplicar permissão.
alter table public.files
  add column project_ids uuid[] not null default '{}';

update public.files
  set project_ids = array[project_id]
  where project_id is not null;

alter table public.files
  drop column project_id;
