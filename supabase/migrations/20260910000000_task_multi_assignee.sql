-- Uma tarefa passa a poder ser delegada para vários membros da equipe ao
-- mesmo tempo — mesmo padrão já usado em `projects.member_ids` (array sem FK
-- própria, já que o vínculo com `team_members` é só informativo aqui).
alter table public.tasks
  add column assignee_ids uuid[] not null default '{}';

update public.tasks
set assignee_ids = array[assignee_id]
where assignee_id is not null;

alter table public.tasks
  drop column assignee_id;
