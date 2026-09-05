-- Fase 2: chat do projeto, notificações e arquivos passam a ser reais/compartilhados.

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.team_members (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Notificações são sempre por destinatário (user_id), nunca compartilhadas por
-- linha entre várias pessoas — cada uma tem seu próprio estado de "lida". Eventos
-- de workspace (tarefa criada, projeto atualizado etc.) notificam quem executou a
-- ação (sincroniza o "feed de atividade" entre os próprios dispositivos dessa
-- pessoa); os dois eventos de contato notificam a outra parte de verdade.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  size bigint not null,
  type text not null,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.files enable row level security;

create policy "chat_messages: membros veem" on public.chat_messages
  for select using (public.is_workspace_member(workspace_id));
create policy "chat_messages: membros enviam" on public.chat_messages
  for insert with check (public.is_workspace_member(workspace_id));
create policy "chat_messages: membros removem" on public.chat_messages
  for delete using (public.is_workspace_member(workspace_id));

create policy "notifications: dono vê" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications: dono ou contato insere" on public.notifications
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.contacts c
      where (c.from_user_id = auth.uid() and c.to_user_id = user_id)
         or (c.to_user_id = auth.uid() and c.from_user_id = user_id)
    )
  );
create policy "notifications: dono atualiza" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications: dono remove" on public.notifications
  for delete using (user_id = auth.uid());

create policy "files: membros veem" on public.files
  for select using (public.is_workspace_member(workspace_id));
create policy "files: membros enviam" on public.files
  for insert with check (public.is_workspace_member(workspace_id));
create policy "files: membros removem" on public.files
  for delete using (public.is_workspace_member(workspace_id));

alter table public.chat_messages replica identity full;
alter table public.notifications replica identity full;
alter table public.files replica identity full;

alter publication supabase_realtime add table
  public.chat_messages,
  public.notifications,
  public.files;

-- Storage: bucket privado para arquivos de projeto. Caminho dos objetos:
-- "<workspace_id>/<project_id>/<file_id>-<nome>" — o primeiro segmento do path
-- é usado pelas policies para checar pertencimento ao workspace.
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "project-files: membros leem" on storage.objects
  for select using (
    bucket_id = 'project-files'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project-files: membros enviam" on storage.objects
  for insert with check (
    bucket_id = 'project-files'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project-files: membros removem" on storage.objects
  for delete using (
    bucket_id = 'project-files'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
