-- Membro pré-selecionado como responsável ao criar tarefas e projetos na
-- workspace. Se o membro sair da equipe, a preferência volta para "Nenhum".
alter table public.workspaces
  add column default_assignee_id uuid references public.team_members (id) on delete set null;
