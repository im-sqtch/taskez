-- TaskEz — schema inicial para colaboração real via Supabase
create extension if not exists pgcrypto;

-- ============================================================
-- Tabelas
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar_color text not null default '#7C5CFF',
  usage_mode text not null default 'personal',
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  role text not null,
  avatar_color text not null,
  status text not null default 'offline',
  workload int not null default 0,
  linked_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  color text not null,
  icon text,
  status text not null default 'active',
  due_date timestamptz,
  member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date timestamptz,
  assignee_id uuid references public.team_members (id) on delete set null,
  subtasks jsonb not null default '[]',
  comments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================
-- Perfil automático ao criar conta (Supabase Auth)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_color, usage_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#7C5CFF'),
    'personal'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helper para RLS: pertence ao workspace? (security definer evita
-- recursão de policy ao consultar a própria workspace_members)
-- ============================================================

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Busca de perfil por e-mail para o fluxo de "adicionar contato" —
-- security definer porque profiles só permite select da própria linha.
create or replace function public.find_profile_by_email(p_email text)
returns table (id uuid, name text, avatar_color text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, avatar_color
  from public.profiles
  where email = lower(trim(p_email));
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.team_members enable row level security;
alter table public.contacts enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create policy "profiles: ver o próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: atualizar o próprio perfil" on public.profiles
  for update using (auth.uid() = id);

create policy "workspaces: membros veem" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "workspaces: qualquer usuário autenticado cria" on public.workspaces
  for insert with check (auth.uid() = created_by);
create policy "workspaces: membros atualizam" on public.workspaces
  for update using (public.is_workspace_member(id));
create policy "workspaces: criador remove" on public.workspaces
  for delete using (auth.uid() = created_by);

create policy "workspace_members: membros veem a lista" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "workspace_members: criador ou membro existente adiciona" on public.workspace_members
  for insert with check (
    public.is_workspace_member(workspace_id)
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid())
  );
create policy "workspace_members: membro sai ou remove outro" on public.workspace_members
  for delete using (public.is_workspace_member(workspace_id));

create policy "team_members: membros veem" on public.team_members
  for select using (public.is_workspace_member(workspace_id));
create policy "team_members: membros adicionam" on public.team_members
  for insert with check (public.is_workspace_member(workspace_id));
create policy "team_members: membros atualizam" on public.team_members
  for update using (public.is_workspace_member(workspace_id));
create policy "team_members: membros removem" on public.team_members
  for delete using (public.is_workspace_member(workspace_id));

create policy "contacts: participantes veem" on public.contacts
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "contacts: remetente convida" on public.contacts
  for insert with check (auth.uid() = from_user_id);
create policy "contacts: participantes atualizam" on public.contacts
  for update using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "contacts: participantes removem" on public.contacts
  for delete using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "projects: membros veem" on public.projects
  for select using (public.is_workspace_member(workspace_id));
create policy "projects: membros criam" on public.projects
  for insert with check (public.is_workspace_member(workspace_id));
create policy "projects: membros atualizam" on public.projects
  for update using (public.is_workspace_member(workspace_id));
create policy "projects: membros removem" on public.projects
  for delete using (public.is_workspace_member(workspace_id));

create policy "tasks: membros veem" on public.tasks
  for select using (public.is_workspace_member(workspace_id));
create policy "tasks: membros criam" on public.tasks
  for insert with check (public.is_workspace_member(workspace_id));
create policy "tasks: membros atualizam" on public.tasks
  for update using (public.is_workspace_member(workspace_id));
create policy "tasks: membros removem" on public.tasks
  for delete using (public.is_workspace_member(workspace_id));

-- ============================================================
-- Realtime
-- ============================================================

alter table public.workspaces replica identity full;
alter table public.workspace_members replica identity full;
alter table public.team_members replica identity full;
alter table public.contacts replica identity full;
alter table public.projects replica identity full;
alter table public.tasks replica identity full;

alter publication supabase_realtime add table
  public.workspaces,
  public.workspace_members,
  public.team_members,
  public.contacts,
  public.projects,
  public.tasks;
