-- O layout do painel modular (quais widgets aparecem, ordem e tamanho) passa a
-- ser específico de cada workspace, e sincronizado entre dispositivos: antes
-- vivia só num único objeto no localStorage, compartilhado entre todas as
-- workspaces do usuário. É uma preferência pessoal (cada membro customiza o
-- próprio painel), não um dado colaborativo do workspace — por isso a chave é
-- (user_id, workspace_id), não algo visível a outros membros.
create table public.dashboard_layouts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  widgets jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

alter table public.dashboard_layouts enable row level security;

create policy "dashboard_layouts: dono vê" on public.dashboard_layouts
  for select using (user_id = auth.uid());
create policy "dashboard_layouts: dono cria" on public.dashboard_layouts
  for insert with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "dashboard_layouts: dono atualiza" on public.dashboard_layouts
  for update using (user_id = auth.uid());
create policy "dashboard_layouts: dono remove" on public.dashboard_layouts
  for delete using (user_id = auth.uid());

alter table public.dashboard_layouts replica identity full;

alter publication supabase_realtime add table public.dashboard_layouts;
