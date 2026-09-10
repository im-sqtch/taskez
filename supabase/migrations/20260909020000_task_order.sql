-- Ordem manual das tarefas dentro de um projeto (ou dentro da lista de
-- avulsas do workspace, quando sem projeto) — mesmo padrão já usado em
-- `projects.order`. Como a tabela tem RLS por workspace (qualquer membro
-- atualiza), a ordem definida por uma pessoa já fica visível para todo mundo
-- que vê o projeto, sem precisar de nenhuma tabela por-usuário.
alter table public.tasks
  add column "order" integer not null default 0;

with ranked as (
  select id, row_number() over (
    partition by coalesce(project_id, workspace_id) order by created_at
  ) - 1 as rn
  from public.tasks
)
update public.tasks
set "order" = ranked.rn
from ranked
where public.tasks.id = ranked.id;
