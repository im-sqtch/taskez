-- Ordem vertical dos projetos, definida manualmente pelo usuário na lista de
-- projetos e refletida também no dashboard. Novos projetos entram no fim da
-- lista (maior "order" do workspace + 1); os já existentes são preenchidos
-- pela ordem de criação para preservar a posição atual.
alter table public.projects
  add column "order" integer not null default 0;

with ranked as (
  select id, row_number() over (partition by workspace_id order by created_at) - 1 as rn
  from public.projects
)
update public.projects
set "order" = ranked.rn
from ranked
where public.projects.id = ranked.id;
