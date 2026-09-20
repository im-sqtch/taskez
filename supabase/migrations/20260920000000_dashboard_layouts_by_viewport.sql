-- Mobile e desktop têm organizações independentes do painel. O layout antigo
-- é preservado como mobile e copiado para desktop, de modo que a migração não
-- altere o painel atual até a pessoa personalizar um dos modos.
alter table public.dashboard_layouts
  add column viewport text not null default 'mobile'
  check (viewport in ('mobile', 'desktop'));

alter table public.dashboard_layouts
  drop constraint dashboard_layouts_pkey;

alter table public.dashboard_layouts
  add primary key (user_id, workspace_id, viewport);

insert into public.dashboard_layouts (user_id, workspace_id, viewport, widgets, updated_at)
select user_id, workspace_id, 'desktop', widgets, updated_at
from public.dashboard_layouts
on conflict (user_id, workspace_id, viewport) do nothing;
