-- Correção #15: nenhuma FK do schema original tinha índice — toda policy de
-- RLS baseada em workspace/usuário (is_workspace_member, is_workspace_owner,
-- "dono vê") faz esse filtro em CADA linha da tabela, e o client carrega
-- praticamente tudo por workspace_id/user_id (ver seedIfEmpty, fetchTrash,
-- deleteWorkspace/leaveWorkspace). Sem índice, cada uma dessas checagens é
-- um sequential scan — barato hoje com poucas linhas, degrada rápido com o
-- crescimento normal de uso.
--
-- Só as colunas com uso comprovado no código (RLS ou `.eq`/`.in` no client)
-- — nada especulativo. Onde a chave primária já cobre o padrão de busca como
-- prefixo (ex.: workspace_members (workspace_id, user_id) para buscas por
-- workspace_id; dashboard_layouts (user_id, workspace_id) sempre buscado com
-- os dois juntos), não duplica índice.

-- workspace_members: a PK (workspace_id, user_id) não ajuda buscar "todas as
-- workspaces de um usuário" (seedIfEmpty) — user_id é a segunda coluna.
create index workspace_members_user_id_idx on public.workspace_members (user_id);

create index team_members_workspace_id_idx on public.team_members (workspace_id);
create index team_members_linked_user_id_idx on public.team_members (linked_user_id);

create index contacts_from_user_id_idx on public.contacts (from_user_id);
create index contacts_to_user_id_idx on public.contacts (to_user_id);

create index projects_workspace_id_idx on public.projects (workspace_id);
create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index chat_messages_workspace_id_idx on public.chat_messages (workspace_id);
create index chat_messages_project_id_idx on public.chat_messages (project_id);
create index files_workspace_id_idx on public.files (workspace_id);

-- notifications: sem filtro de workspace no client (RLS já restringe a
-- user_id = auth.uid()) — essa policy roda em toda linha da tabela inteira
-- em toda carga, é a que mais se beneficia de um índice aqui.
create index notifications_user_id_idx on public.notifications (user_id);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index scheduled_notifications_user_id_idx on public.scheduled_notifications (user_id);
