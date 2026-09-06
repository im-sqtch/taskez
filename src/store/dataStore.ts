import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { fireAndForget, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { WIDGET_CATALOG, WIDGET_TYPES } from '@/lib/widgetCatalog'
import type {
  ChatMessage,
  DashboardLayout,
  Notification,
  Priority,
  Project,
  ProjectFile,
  Subtask,
  Task,
  TaskStatus,
  TeamMember,
  Workspace,
} from '@/types'

const now = () => new Date().toISOString()

// ============================================================
// Mapeamento linha do Postgres (snake_case) <-> tipos do app (camelCase)
// ============================================================

interface WorkspaceRow {
  id: string
  name: string
  color: string
  created_by: string
  created_at: string
}

interface TeamMemberRow {
  id: string
  workspace_id: string
  name: string
  role: string
  avatar_color: string
  status: TeamMember['status']
  workload: number
  linked_user_id: string | null
  created_at: string
}

interface ProjectRow {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  status: Project['status']
  due_date: string | null
  member_ids: string[]
  created_at: string
}

interface TaskRow {
  id: string
  workspace_id: string
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  assignee_id: string | null
  subtasks: Subtask[]
  comments: Task['comments']
  created_at: string
  updated_at: string
  completed_at: string | null
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at }
}

function mapTeamMember(row: TeamMemberRow, currentUserId: string | null): TeamMember {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    role: row.role,
    avatarColor: row.avatar_color,
    status: row.status,
    workload: row.workload,
    linkedUserId: row.linked_user_id ?? undefined,
    isSelf: row.linked_user_id !== null && row.linked_user_id === currentUserId,
  }
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color,
    icon: row.icon ?? undefined,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    memberIds: row.member_ids ?? [],
    createdAt: row.created_at,
  }
}

interface ChatMessageRow {
  id: string
  workspace_id: string
  project_id: string
  author_id: string
  text: string
  created_at: string
}

interface NotificationRow {
  id: string
  user_id: string
  workspace_id: string | null
  type: Notification['type']
  title: string
  body: string
  read: boolean
  created_at: string
  entity_type: Notification['entityType'] | null
  entity_id: string | null
}

interface ProjectFileRow {
  id: string
  workspace_id: string
  project_id: string
  name: string
  size: number
  type: string
  storage_path: string
  uploaded_by: string
  created_at: string
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return { id: row.id, projectId: row.project_id, authorId: row.author_id, text: row.text, createdAt: row.created_at }
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
  }
}

function mapProjectFile(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    name: row.name,
    size: row.size,
    type: row.type,
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    projectId: row.project_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    subtasks: row.subtasks ?? [],
    comments: row.comments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  }
}

function projectPatchToRow(patch: Partial<Project>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description ?? null
  if (patch.color !== undefined) row.color = patch.color
  if (patch.icon !== undefined) row.icon = patch.icon ?? null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate ?? null
  if (patch.memberIds !== undefined) row.member_ids = patch.memberIds
  return row
}

function taskPatchToRow(patch: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description ?? null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.projectId !== undefined) row.project_id = patch.projectId ?? null
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate ?? null
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId ?? null
  if (patch.subtasks !== undefined) row.subtasks = patch.subtasks
  if (patch.comments !== undefined) row.comments = patch.comments
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt ?? null
  return row
}

function getSelfMember(team: TeamMember[]): TeamMember | undefined {
  return team.find((m) => m.isSelf)
}

// Notificações são sempre por destinatário. Para eventos de workspace (tarefa
// delegada, projeto criado etc.) o destinatário é o próprio usuário que executou
// a ação — isso sincroniza o "feed de atividade" entre os dispositivos dele. Já
// persiste no Supabase aqui mesmo para não precisar repetir isso em cada chamador.
function makeNotification(
  userId: string,
  workspaceId: string | undefined,
  type: Notification['type'],
  title: string,
  body: string,
  entity?: { type: Notification['entityType']; id: string },
): Notification {
  const notification: Notification = {
    id: uuid(),
    workspaceId,
    title,
    body,
    read: false,
    createdAt: now(),
    type,
    entityType: entity?.type,
    entityId: entity?.id,
  }
  fireAndForget(
    supabase.from('notifications').insert({
      id: notification.id,
      user_id: userId,
      workspace_id: notification.workspaceId ?? null,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      read: notification.read,
      created_at: notification.createdAt,
      entity_type: notification.entityType ?? null,
      entity_id: notification.entityId ?? null,
    }),
  )
  return notification
}

export function defaultLayout(): DashboardLayout {
  return {
    widgets: WIDGET_TYPES.map((type, index) => ({
      id: `w-${type}`,
      type,
      size: WIDGET_CATALOG[type].defaultSize,
      visible: true,
      order: index,
    })),
  }
}

// Garante que todo tipo do catálogo tenha uma entrada no layout salvo — necessário
// porque novos tipos de widget (ex.: shortcuts, utility) podem ter sido adicionados
// depois que o usuário já tinha um layout persistido no localStorage. Também corrige
// tamanhos salvos que deixaram de ser permitidos para o tipo (ex.: allowedSizes reduzido).
function normalizeLayout(layout: DashboardLayout): DashboardLayout {
  const existingTypes = new Set(layout.widgets.map((w) => w.type))
  const missing = WIDGET_TYPES.filter((type) => !existingTypes.has(type))
  const maxOrder = layout.widgets.reduce((max, w) => Math.max(max, w.order), -1)

  const fixedSizes = layout.widgets.map((w) =>
    WIDGET_CATALOG[w.type].allowedSizes.includes(w.size) ? w : { ...w, size: WIDGET_CATALOG[w.type].defaultSize },
  )

  if (missing.length === 0) return { widgets: fixedSizes }

  const appended = missing.map((type, i) => ({
    id: `w-${type}`,
    type,
    size: WIDGET_CATALOG[type].defaultSize,
    visible: false,
    order: maxOrder + 1 + i,
  }))
  return { widgets: [...fixedSizes, ...appended] }
}

interface DataState {
  loading: boolean
  profileSizeMigrated: boolean
  workspaces: Workspace[]
  currentWorkspaceId: string
  projects: Project[]
  tasks: Task[]
  team: TeamMember[]
  notifications: Notification[]
  chatMessages: ChatMessage[]
  files: ProjectFile[]
  layout: DashboardLayout

  seedIfEmpty: () => Promise<void>
  resetWorkspaceData: () => void
  migrateProfileSizeIfNeeded: () => void
  // Chamado pelo authStore quando o usuário edita nome/cor do avatar em
  // Configurações — mantém a entrada "isSelf" em sincronia em todos os
  // workspaces (senão o roster de equipe/atribuição de tarefas mostraria um
  // nome desatualizado mesmo com o header já refletindo o novo).
  syncSelfProfile: (patch: { name?: string; avatarColor?: string }) => void

  // Workspaces
  addWorkspace: (name: string, color: string) => string
  switchWorkspace: (id: string) => void
  renameWorkspace: (id: string, name: string) => void
  deleteWorkspace: (id: string) => void

  // Equipe do workspace
  addTeamMember: (data: { name: string; role: string; avatarColor: string; linkedUserId?: string }) => void

  // Projects
  addProject: (data: Omit<Project, 'id' | 'workspaceId' | 'createdAt'>) => string
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  addChatMessage: (projectId: string, authorId: string, text: string) => void
  addFile: (data: Omit<ProjectFile, 'id' | 'createdAt'>) => void
  removeFile: (id: string) => void

  // Tasks
  addTask: (data: Partial<Task> & { title: string }) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskStatus: (id: string) => void
  setTaskStatus: (id: string, status: TaskStatus) => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  removeSubtask: (taskId: string, subtaskId: string) => void
  addComment: (taskId: string, authorId: string, text: string) => void

  // Notifications
  markNotificationRead: (id: string) => void
  markNotificationUnread: (id: string) => void
  markAllNotificationsRead: () => void
  deleteNotification: (id: string) => void
  // Ponto de entrada público para outras stores (ex.: contactsStore) gerarem uma
  // notificação sem duplicar a lógica de criação — usado para eventos de conta que
  // não pertencem a nenhum workspace específico (ex.: contato aceitou convite).
  addNotification: (type: Notification['type'], title: string, body: string, workspaceId?: string) => void

  // Dashboard layout
  setLayout: (layout: DashboardLayout) => void
  resetLayout: () => void
  toggleWidgetVisible: (widgetId: string) => void
  resizeWidget: (widgetId: string, size: 'S' | 'M' | 'L') => void
  reorderWidgets: (orderedIds: string[]) => void
}

let realtimeChannel: RealtimeChannel | null = null

function teardownRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

function setupRealtime() {
  teardownRealtime()
  realtimeChannel = supabase
    .channel('taskez-workspace-data')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<WorkspaceRow>
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== oldId) }))
        return
      }
      const workspace = mapWorkspace(p.new as WorkspaceRow)
      useDataStore.setState((state) => {
        const exists = state.workspaces.some((w) => w.id === workspace.id)
        return { workspaces: exists ? state.workspaces.map((w) => (w.id === workspace.id ? workspace : w)) : [...state.workspaces, workspace] }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, () => {
      // Composição do workspace mudou (fui adicionado/removido) — mais simples e
      // seguro refazer o carregamento completo do que reconciliar incrementalmente.
      void useDataStore.getState().seedIfEmpty()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<TeamMemberRow>
      const currentUserId = useAuthStore.getState().currentUserId
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ team: state.team.filter((m) => m.id !== oldId) }))
        return
      }
      const member = mapTeamMember(p.new as TeamMemberRow, currentUserId)
      useDataStore.setState((state) => {
        const exists = state.team.some((m) => m.id === member.id)
        return { team: exists ? state.team.map((m) => (m.id === member.id ? member : m)) : [...state.team, member] }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<ProjectRow>
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ projects: state.projects.filter((pr) => pr.id !== oldId) }))
        return
      }
      const project = mapProject(p.new as ProjectRow)
      useDataStore.setState((state) => {
        const exists = state.projects.some((pr) => pr.id === project.id)
        return { projects: exists ? state.projects.map((pr) => (pr.id === project.id ? project : pr)) : [...state.projects, project] }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<TaskRow>
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ tasks: state.tasks.filter((t) => t.id !== oldId) }))
        return
      }
      const task = mapTask(p.new as TaskRow)
      useDataStore.setState((state) => {
        const exists = state.tasks.some((t) => t.id === task.id)
        return { tasks: exists ? state.tasks.map((t) => (t.id === task.id ? task : t)) : [...state.tasks, task] }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<ChatMessageRow>
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ chatMessages: state.chatMessages.filter((m) => m.id !== oldId) }))
        return
      }
      const message = mapChatMessage(p.new as ChatMessageRow)
      useDataStore.setState((state) => {
        const exists = state.chatMessages.some((m) => m.id === message.id)
        return { chatMessages: exists ? state.chatMessages.map((m) => (m.id === message.id ? message : m)) : [...state.chatMessages, message] }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<ProjectFileRow>
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ files: state.files.filter((f) => f.id !== oldId) }))
        return
      }
      const file = mapProjectFile(p.new as ProjectFileRow)
      useDataStore.setState((state) => {
        const exists = state.files.some((f) => f.id === file.id)
        return { files: exists ? state.files.map((f) => (f.id === file.id ? file : f)) : [...state.files, file] }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
      const p = payload as RealtimePostgresChangesPayload<NotificationRow>
      if (p.eventType === 'DELETE') {
        const oldId = (p.old as { id?: string }).id
        if (!oldId) return
        useDataStore.setState((state) => ({ notifications: state.notifications.filter((n) => n.id !== oldId) }))
        return
      }
      const notification = mapNotification(p.new as NotificationRow)
      useDataStore.setState((state) => {
        const exists = state.notifications.some((n) => n.id === notification.id)
        return {
          notifications: exists
            ? state.notifications.map((n) => (n.id === notification.id ? notification : n))
            : [...state.notifications, notification],
        }
      })
    })
    .subscribe()
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      loading: false,
      profileSizeMigrated: false,
      workspaces: [],
      currentWorkspaceId: '',
      projects: [],
      tasks: [],
      team: [],
      notifications: [],
      chatMessages: [],
      files: [],
      layout: defaultLayout(),

      // Carrega os workspaces do usuário logado a partir do Supabase. Se ele nunca
      // teve nenhum, cria o primeiro (com ele mesmo na equipe) — tudo já gravado no
      // backend, pronto para convidar colaboradores reais depois.
      seedIfEmpty: async () => {
        if (get().loading) return
        const userId = useAuthStore.getState().currentUserId
        if (!userId) return
        set({ loading: true })

        const { data: memberRows } = await supabase
          .from('workspace_members')
          .select('workspace_id, workspaces(*)')
          .eq('user_id', userId)

        const workspaceRows = (memberRows ?? [])
          .map((r) => r.workspaces as unknown as WorkspaceRow | null)
          .filter((w): w is WorkspaceRow => Boolean(w))

        if (workspaceRows.length > 0) {
          const workspaces = workspaceRows.map(mapWorkspace)
          const workspaceIds = workspaces.map((w) => w.id)
          const [{ data: teamRows }, { data: projectRows }, { data: taskRows }, { data: chatRows }, { data: fileRows }, { data: notificationRows }] =
            await Promise.all([
              supabase.from('team_members').select('*').in('workspace_id', workspaceIds),
              supabase.from('projects').select('*').in('workspace_id', workspaceIds),
              supabase.from('tasks').select('*').in('workspace_id', workspaceIds),
              supabase.from('chat_messages').select('*').in('workspace_id', workspaceIds),
              supabase.from('files').select('*').in('workspace_id', workspaceIds),
              // Sem filtro de workspace: RLS já restringe a `user_id = auth.uid()`,
              // e notificações de conta (contato aceito etc.) não têm workspace_id.
              supabase.from('notifications').select('*').order('created_at', { ascending: true }),
            ])
          set((state) => ({
            loading: false,
            workspaces,
            currentWorkspaceId: state.currentWorkspaceId && workspaceIds.includes(state.currentWorkspaceId) ? state.currentWorkspaceId : workspaces[0]!.id,
            team: (teamRows ?? []).map((r) => mapTeamMember(r as TeamMemberRow, userId)),
            projects: (projectRows ?? []).map((r) => mapProject(r as ProjectRow)),
            tasks: (taskRows ?? []).map((r) => mapTask(r as TaskRow)),
            chatMessages: (chatRows ?? []).map((r) => mapChatMessage(r as ChatMessageRow)),
            files: (fileRows ?? []).map((r) => mapProjectFile(r as ProjectFileRow)),
            notifications: (notificationRows ?? []).map((r) => mapNotification(r as NotificationRow)),
          }))
          // Corrige contas antigas cuja entrada "isSelf" ainda ficou salva como o
          // placeholder genérico "Você" em vez do nome real do perfil.
          const profileName = useAuthStore.getState().profile?.name
          const selfRow = (teamRows ?? []).find((r) => (r as TeamMemberRow).linked_user_id === userId)
          if (profileName && selfRow && (selfRow as TeamMemberRow).name !== profileName) {
            get().syncSelfProfile({ name: profileName })
          }
          setupRealtime()
          return
        }

        // Primeira vez deste usuário: cria um workspace padrão e coloca ele mesmo na equipe.
        const profile = useAuthStore.getState().profile
        const workspaceId = uuid()
        const workspace: Workspace = { id: workspaceId, name: 'Meu workspace', color: '#7C5CFF', createdAt: now() }
        const selfMember: TeamMember = {
          id: uuid(),
          workspaceId,
          name: profile?.name ?? 'Você',
          role: 'Organizador(a)',
          avatarColor: profile?.avatarColor ?? '#7C5CFF',
          status: 'online',
          workload: 0,
          linkedUserId: userId,
          isSelf: true,
        }
        const { data: notificationRows } = await supabase.from('notifications').select('*').order('created_at', { ascending: true })
        set({
          loading: false,
          workspaces: [workspace],
          currentWorkspaceId: workspaceId,
          team: [selfMember],
          projects: [],
          tasks: [],
          chatMessages: [],
          files: [],
          notifications: (notificationRows ?? []).map((r) => mapNotification(r as NotificationRow)),
        })
        await supabase.from('workspaces').insert({ id: workspaceId, name: workspace.name, color: workspace.color, created_by: userId })
        await supabase.from('workspace_members').insert({ workspace_id: workspaceId, user_id: userId, role: 'owner' })
        await supabase.from('team_members').insert({
          id: selfMember.id,
          workspace_id: workspaceId,
          name: selfMember.name,
          role: selfMember.role,
          avatar_color: selfMember.avatarColor,
          status: selfMember.status,
          workload: selfMember.workload,
          linked_user_id: userId,
        })
        setupRealtime()
      },

      resetWorkspaceData: () => {
        teardownRealtime()
        set({
          loading: false,
          workspaces: [],
          currentWorkspaceId: '',
          projects: [],
          tasks: [],
          team: [],
          chatMessages: [],
          files: [],
          notifications: [],
        })
      },

      syncSelfProfile: (patch) => {
        const userId = useAuthStore.getState().currentUserId
        if (!userId) return
        set((state) => ({
          team: state.team.map((m) => (m.isSelf ? { ...m, ...patch } : m)),
        }))
        const row: Record<string, string> = {}
        if (patch.name !== undefined) row.name = patch.name
        if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor
        if (Object.keys(row).length > 0) {
          fireAndForget(supabase.from('team_members').update(row).eq('linked_user_id', userId))
        }
      },

      // O widget "profile" deixou de ter um único tamanho ('M'). O que antes era o
      // único visual disponível agora é o tamanho 'S'; quem já tinha esse widget
      // salvo como 'M' migra uma única vez para 'S', para não ganhar as novas
      // estatísticas sem ter escolhido isso. Precisa ser uma action de verdade (via
      // `set`) e não uma mutação dentro de `onRehydrateStorage`, que não persiste.
      migrateProfileSizeIfNeeded: () => {
        if (get().profileSizeMigrated) return
        set((state) => ({
          profileSizeMigrated: true,
          layout: {
            widgets: state.layout.widgets.map((w) =>
              w.type === 'profile' && w.size === 'M' ? { ...w, size: 'S' as const } : w,
            ),
          },
        }))
      },

      addWorkspace: (name, color) => {
        const id = uuid()
        const userId = useAuthStore.getState().currentUserId
        const profile = useAuthStore.getState().profile
        const selfMember: TeamMember = {
          id: uuid(),
          workspaceId: id,
          name: profile?.name ?? 'Você',
          role: 'Organizador(a)',
          avatarColor: profile?.avatarColor ?? '#7C5CFF',
          status: 'online',
          workload: 0,
          linkedUserId: userId ?? undefined,
          isSelf: true,
        }
        set((state) => ({
          workspaces: [...state.workspaces, { id, name: name.trim(), color, createdAt: now() }],
          team: [...state.team, selfMember],
          currentWorkspaceId: id,
        }))
        if (userId) {
          void (async () => {
            await supabase.from('workspaces').insert({ id, name: name.trim(), color, created_by: userId })
            await supabase.from('workspace_members').insert({ workspace_id: id, user_id: userId, role: 'owner' })
            await supabase.from('team_members').insert({
              id: selfMember.id,
              workspace_id: id,
              name: selfMember.name,
              role: selfMember.role,
              avatar_color: selfMember.avatarColor,
              status: selfMember.status,
              workload: selfMember.workload,
              linked_user_id: userId,
            })
          })()
        }
        return id
      },
      switchWorkspace: (id) => set({ currentWorkspaceId: id }),
      renameWorkspace: (id, name) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, name: name.trim() } : w)),
        }))
        fireAndForget(supabase.from('workspaces').update({ name: name.trim() }).eq('id', id))
      },
      deleteWorkspace: (id) => {
        set((state) => {
          if (state.workspaces.length <= 1) return state
          const projectIds = new Set(state.projects.filter((p) => p.workspaceId === id).map((p) => p.id))
          const nextWorkspaceId =
            state.currentWorkspaceId === id
              ? state.workspaces.find((w) => w.id !== id)!.id
              : state.currentWorkspaceId
          return {
            workspaces: state.workspaces.filter((w) => w.id !== id),
            currentWorkspaceId: nextWorkspaceId,
            projects: state.projects.filter((p) => p.workspaceId !== id),
            tasks: state.tasks.filter((t) => t.workspaceId !== id),
            team: state.team.filter((m) => m.workspaceId !== id),
            notifications: state.notifications.filter((n) => n.workspaceId !== id),
            chatMessages: state.chatMessages.filter((m) => !projectIds.has(m.projectId)),
            files: state.files.filter((f) => !projectIds.has(f.projectId)),
          }
        })
        // Exclusão em cascata (workspace_members/team_members/projects/tasks) já é
        // resolvida pelas foreign keys "on delete cascade" no banco.
        fireAndForget(supabase.from('workspaces').delete().eq('id', id))
      },

      addTeamMember: (data) => {
        const id = uuid()
        const workspaceId = get().currentWorkspaceId
        const currentUserId = useAuthStore.getState().currentUserId!
        set((state) => ({
          team: [
            ...state.team,
            {
              id,
              workspaceId,
              name: data.name,
              role: data.role,
              avatarColor: data.avatarColor,
              status: 'offline',
              workload: 0,
              linkedUserId: data.linkedUserId,
              isSelf: data.linkedUserId !== undefined && data.linkedUserId === currentUserId,
            },
          ],
          notifications: [
            ...state.notifications,
            makeNotification(currentUserId, workspaceId, 'team', 'Novo membro na equipe', `${data.name} entrou na equipe do workspace.`),
          ],
        }))
        fireAndForget(
          supabase.from('team_members').insert({
            id,
            workspace_id: workspaceId,
            name: data.name,
            role: data.role,
            avatar_color: data.avatarColor,
            status: 'offline',
            workload: 0,
            linked_user_id: data.linkedUserId ?? null,
          }),
        )
        // Se é um contato real, garante acesso de fato ao workspace (RLS depende disso).
        if (data.linkedUserId) {
          fireAndForget(
            supabase.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: data.linkedUserId }, { onConflict: 'workspace_id,user_id' }),
          )
        }
      },

      addProject: (data) => {
        const id = uuid()
        const workspaceId = get().currentWorkspaceId
        const userId = useAuthStore.getState().currentUserId!
        set((state) => ({
          projects: [...state.projects, { ...data, id, workspaceId, createdAt: now() }],
          notifications: [
            ...state.notifications,
            makeNotification(userId, workspaceId, 'project', 'Projeto criado', `"${data.name}" foi criado.`, { type: 'project', id }),
          ],
        }))
        fireAndForget(
          supabase.from('projects').insert({
            id,
            workspace_id: workspaceId,
            name: data.name,
            description: data.description ?? null,
            color: data.color,
            icon: data.icon ?? null,
            status: data.status,
            due_date: data.dueDate ?? null,
            member_ids: data.memberIds,
          }),
        )
        return id
      },
      updateProject: (id, patch) => {
        const userId = useAuthStore.getState().currentUserId!
        set((state) => {
          const project = state.projects.find((p) => p.id === id)
          const notifications = [...state.notifications]
          if (project && patch.memberIds) {
            const addedIds = patch.memberIds.filter((memberId) => !project.memberIds.includes(memberId))
            const selfId = getSelfMember(state.team.filter((m) => m.workspaceId === project.workspaceId))?.id
            for (const memberId of addedIds) {
              if (memberId === selfId) continue // é "Você" — não faz sentido notificar o próprio convite
              const member = state.team.find((m) => m.id === memberId)
              if (member) {
                notifications.push(
                  makeNotification(userId, project.workspaceId, 'team', 'Novo membro no projeto', `${member.name} foi adicionado a "${project.name}".`, {
                    type: 'project',
                    id: project.id,
                  }),
                )
              }
            }
          }
          // Só avisa "projeto atualizado" quando algo além dos membros mudou — a
          // entrada/saída de alguém já tem sua própria notificação mais específica.
          const hasNonMemberChange = Object.keys(patch).some((key) => key !== 'memberIds')
          if (project && hasNonMemberChange) {
            const displayName = patch.name ?? project.name
            notifications.push(
              makeNotification(userId, project.workspaceId, 'project', 'Projeto atualizado', `"${displayName}" foi atualizado.`, {
                type: 'project',
                id: project.id,
              }),
            )
          }
          fireAndForget(supabase.from('projects').update(projectPatchToRow(patch)).eq('id', id))
          return {
            projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            notifications,
          }
        })
      },
      deleteProject: (id) => {
        const userId = useAuthStore.getState().currentUserId!
        set((state) => {
          const project = state.projects.find((p) => p.id === id)
          return {
            projects: state.projects.filter((p) => p.id !== id),
            tasks: state.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
            chatMessages: state.chatMessages.filter((m) => m.projectId !== id),
            files: state.files.filter((f) => f.projectId !== id),
            notifications: project
              ? [...state.notifications, makeNotification(userId, project.workspaceId, 'project', 'Projeto excluído', `"${project.name}" foi excluído.`)]
              : state.notifications,
          }
        })
        // Exclusão em cascata de chat_messages/files/tasks já é resolvida pelas
        // foreign keys "on delete cascade" no banco.
        fireAndForget(supabase.from('projects').delete().eq('id', id))
      },
      addChatMessage: (projectId, authorId, text) => {
        const userId = useAuthStore.getState().currentUserId!
        const id = uuid()
        const createdAt = now()
        set((state) => {
          const project = state.projects.find((p) => p.id === projectId)
          const preview = text.length > 60 ? `${text.slice(0, 57)}...` : text
          return {
            chatMessages: [...state.chatMessages, { id, projectId, authorId, text, createdAt }],
            notifications: project
              ? [
                  ...state.notifications,
                  makeNotification(userId, project.workspaceId, 'project', `Nova mensagem em ${project.name}`, preview, { type: 'project', id: project.id }),
                ]
              : state.notifications,
          }
        })
        const workspaceId = get().projects.find((p) => p.id === projectId)?.workspaceId
        if (workspaceId) {
          fireAndForget(
            supabase.from('chat_messages').insert({ id, workspace_id: workspaceId, project_id: projectId, author_id: authorId, text, created_at: createdAt }),
          )
        }
      },
      addFile: (data) => {
        const userId = useAuthStore.getState().currentUserId!
        const id = uuid()
        const createdAt = now()
        set((state) => {
          const project = state.projects.find((p) => p.id === data.projectId)
          return {
            files: [...state.files, { ...data, id, createdAt }],
            notifications: project
              ? [
                  ...state.notifications,
                  makeNotification(userId, project.workspaceId, 'project', 'Novo arquivo', `"${data.name}" foi enviado em "${project.name}".`, {
                    type: 'project',
                    id: project.id,
                  }),
                ]
              : state.notifications,
          }
        })
        fireAndForget(
          supabase.from('files').insert({
            id,
            workspace_id: data.workspaceId,
            project_id: data.projectId,
            name: data.name,
            size: data.size,
            type: data.type,
            storage_path: data.storagePath,
            uploaded_by: data.uploadedBy,
            created_at: createdAt,
          }),
        )
      },
      removeFile: (id) => {
        const userId = useAuthStore.getState().currentUserId!
        const storagePath = get().files.find((f) => f.id === id)?.storagePath
        set((state) => {
          const file = state.files.find((f) => f.id === id)
          const project = file ? state.projects.find((p) => p.id === file.projectId) : undefined
          return {
            files: state.files.filter((f) => f.id !== id),
            notifications:
              file && project
                ? [
                    ...state.notifications,
                    makeNotification(userId, project.workspaceId, 'project', 'Arquivo excluído', `"${file.name}" foi excluído de "${project.name}".`, {
                      type: 'project',
                      id: project.id,
                    }),
                  ]
                : state.notifications,
          }
        })
        fireAndForget(supabase.from('files').delete().eq('id', id))
        if (storagePath) fireAndForget(supabase.storage.from('project-files').remove([storagePath]))
      },

      addTask: (data) => {
        const id = uuid()
        const workspaceId = get().currentWorkspaceId
        const userId = useAuthStore.getState().currentUserId!
        const task: Task = {
          id,
          workspaceId,
          title: data.title,
          description: data.description,
          status: data.status ?? 'todo',
          priority: data.priority ?? 'medium',
          projectId: data.projectId,
          dueDate: data.dueDate,
          assigneeId: data.assigneeId,
          subtasks: data.subtasks ?? [],
          comments: data.comments ?? [],
          createdAt: now(),
          updatedAt: now(),
        }
        set((state) => {
          const selfId = getSelfMember(state.team.filter((m) => m.workspaceId === workspaceId))?.id
          const member = task.assigneeId && task.assigneeId !== selfId ? state.team.find((m) => m.id === task.assigneeId) : undefined
          const isSelfAssigned = !!task.assigneeId && task.assigneeId === selfId
          const notification = member
            ? makeNotification(userId, workspaceId, 'task', 'Tarefa delegada', `"${task.title}" foi delegada para ${member.name}.`, { type: 'task', id: task.id })
            : isSelfAssigned
              ? makeNotification(userId, workspaceId, 'task', 'Tarefa criada', `"${task.title}" foi criada e atribuída a você.`, { type: 'task', id: task.id })
              : undefined
          return {
            tasks: [...state.tasks, task],
            notifications: notification ? [...state.notifications, notification] : state.notifications,
          }
        })
        fireAndForget(
          supabase.from('tasks').insert({
            id,
            workspace_id: workspaceId,
            title: task.title,
            description: task.description ?? null,
            status: task.status,
            priority: task.priority,
            project_id: task.projectId ?? null,
            due_date: task.dueDate ?? null,
            assignee_id: task.assigneeId ?? null,
            subtasks: task.subtasks,
            comments: task.comments,
          }),
        )
        return id
      },
      updateTask: (id, patch) => {
        const userId = useAuthStore.getState().currentUserId!
        set((state) => {
          const existing = state.tasks.find((t) => t.id === id)
          const notifications = [...state.notifications]
          if (existing) {
            const selfId = getSelfMember(state.team.filter((m) => m.workspaceId === existing.workspaceId))?.id
            if (patch.assigneeId && patch.assigneeId !== existing.assigneeId && patch.assigneeId !== selfId) {
              const member = state.team.find((m) => m.id === patch.assigneeId)
              if (member) {
                notifications.push(
                  makeNotification(userId, existing.workspaceId, 'task', 'Tarefa delegada', `"${existing.title}" foi delegada para ${member.name}.`, {
                    type: 'task',
                    id: existing.id,
                  }),
                )
              }
            }
          }
          return {
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)),
            notifications,
          }
        })
        fireAndForget(supabase.from('tasks').update({ ...taskPatchToRow(patch), updated_at: now() }).eq('id', id))
      },
      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
        fireAndForget(supabase.from('tasks').delete().eq('id', id))
      },
      toggleTaskStatus: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return
        const userId = useAuthStore.getState().currentUserId!
        const becomingDone = task.status !== 'done'
        const status: TaskStatus = becomingDone ? 'done' : 'todo'
        const completedAt = status === 'done' ? now() : undefined
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, status, completedAt, updatedAt: now() } : t)),
          notifications: becomingDone
            ? [...state.notifications, makeNotification(userId, task.workspaceId, 'task', 'Tarefa concluída', `"${task.title}" foi concluída.`, { type: 'task', id: task.id })]
            : state.notifications,
        }))
        fireAndForget(supabase.from('tasks').update({ status, completed_at: completedAt ?? null, updated_at: now() }).eq('id', id))
      },
      setTaskStatus: (id, status) => {
        const task = get().tasks.find((t) => t.id === id)
        const userId = useAuthStore.getState().currentUserId!
        const becomingDone = !!task && task.status !== 'done' && status === 'done'
        const completedAt = status === 'done' ? now() : undefined
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, status, completedAt, updatedAt: now() } : t)),
          notifications:
            becomingDone && task
              ? [
                  ...state.notifications,
                  makeNotification(userId, task.workspaceId, 'task', 'Tarefa concluída', `"${task.title}" foi concluída.`, { type: 'task', id: task.id }),
                ]
              : state.notifications,
        }))
        fireAndForget(supabase.from('tasks').update({ status, completed_at: completedAt ?? null, updated_at: now() }).eq('id', id))
      },
      addSubtask: (taskId, title) => {
        let nextSubtasks: Subtask[] = []
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t
            nextSubtasks = [...t.subtasks, { id: uuid(), title, done: false }]
            return { ...t, subtasks: nextSubtasks, updatedAt: now() }
          }),
        }))
        fireAndForget(supabase.from('tasks').update({ subtasks: nextSubtasks, updated_at: now() }).eq('id', taskId))
      },
      toggleSubtask: (taskId, subtaskId) => {
        let nextSubtasks: Subtask[] = []
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t
            nextSubtasks = t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
            return { ...t, subtasks: nextSubtasks, updatedAt: now() }
          }),
        }))
        fireAndForget(supabase.from('tasks').update({ subtasks: nextSubtasks, updated_at: now() }).eq('id', taskId))
      },
      removeSubtask: (taskId, subtaskId) => {
        let nextSubtasks: Subtask[] = []
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t
            nextSubtasks = t.subtasks.filter((s) => s.id !== subtaskId)
            return { ...t, subtasks: nextSubtasks }
          }),
        }))
        fireAndForget(supabase.from('tasks').update({ subtasks: nextSubtasks }).eq('id', taskId))
      },
      addComment: (taskId, authorId, text) => {
        const userId = useAuthStore.getState().currentUserId!
        let nextComments: Task['comments'] = []
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          return {
            tasks: state.tasks.map((t) => {
              if (t.id !== taskId) return t
              nextComments = [...t.comments, { id: uuid(), authorId, text, createdAt: now() }]
              return { ...t, comments: nextComments, updatedAt: now() }
            }),
            notifications: task
              ? [
                  ...state.notifications,
                  makeNotification(userId, task.workspaceId, 'task', 'Novo comentário', `Comentário em "${task.title}".`, { type: 'task', id: task.id }),
                ]
              : state.notifications,
          }
        })
        fireAndForget(supabase.from('tasks').update({ comments: nextComments, updated_at: now() }).eq('id', taskId))
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }))
        fireAndForget(supabase.from('notifications').update({ read: true }).eq('id', id))
      },
      markNotificationUnread: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: false } : n)),
        }))
        fireAndForget(supabase.from('notifications').update({ read: false }).eq('id', id))
      },
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
        fireAndForget(supabase.from('notifications').delete().eq('id', id))
      },
      markAllNotificationsRead: () => {
        const state = get()
        const ids = state.notifications
          .filter((n) => (n.workspaceId === state.currentWorkspaceId || n.workspaceId === undefined) && !n.read)
          .map((n) => n.id)
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.workspaceId === state.currentWorkspaceId || n.workspaceId === undefined ? { ...n, read: true } : n,
          ),
        }))
        if (ids.length > 0) fireAndForget(supabase.from('notifications').update({ read: true }).in('id', ids))
      },
      addNotification: (type, title, body, workspaceId) => {
        const userId = useAuthStore.getState().currentUserId!
        set((state) => ({
          notifications: [...state.notifications, makeNotification(userId, workspaceId, type, title, body)],
        }))
      },

      setLayout: (layout) => set({ layout }),
      resetLayout: () => set({ layout: defaultLayout() }),
      toggleWidgetVisible: (widgetId) =>
        set((state) => ({
          layout: {
            widgets: state.layout.widgets.map((w) =>
              w.id === widgetId ? { ...w, visible: !w.visible } : w,
            ),
          },
        })),
      resizeWidget: (widgetId, size) =>
        set((state) => ({
          layout: {
            widgets: state.layout.widgets.map((w) => (w.id === widgetId ? { ...w, size } : w)),
          },
        })),
      reorderWidgets: (orderedIds) =>
        set((state) => ({
          layout: {
            widgets: orderedIds
              .map((id, index) => {
                const widget = state.layout.widgets.find((w) => w.id === id)
                return widget ? { ...widget, order: index } : undefined
              })
              .filter((w): w is NonNullable<typeof w> => Boolean(w)),
          },
        })),
    }),
    {
      name: 'taskez-data',
      // Só o que é genuinamente local (não colaborativo) é persistido — o resto
      // (workspaces, equipe, projetos, tarefas, chat, arquivos, notificações) já
      // vive no Supabase e é recarregado via `seedIfEmpty()` a cada sessão.
      partialize: (state) => ({
        profileSizeMigrated: state.profileSizeMigrated,
        layout: state.layout,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.layout = normalizeLayout(state.layout)
      },
    },
  ),
)

// Hooks derivados: filtram pelo workspace atual no corpo do hook (não dentro do
// seletor do zustand) para não recriar array a cada notificação de store e cair no
// loop de re-render que um `.filter()` direto no seletor causaria.
export function useWorkspaceProjects() {
  const projects = useDataStore((s) => s.projects)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  return projects.filter((p) => p.workspaceId === currentWorkspaceId)
}

export function useWorkspaceTasks() {
  const tasks = useDataStore((s) => s.tasks)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  return tasks.filter((t) => t.workspaceId === currentWorkspaceId)
}

export function useWorkspaceTeam() {
  const team = useDataStore((s) => s.team)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  return team.filter((m) => m.workspaceId === currentWorkspaceId)
}

export function useWorkspaceNotifications() {
  const notifications = useDataStore((s) => s.notifications)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  return notifications.filter((n) => n.workspaceId === currentWorkspaceId || n.workspaceId === undefined)
}

export function useCurrentWorkspace() {
  const workspaces = useDataStore((s) => s.workspaces)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  return workspaces.find((w) => w.id === currentWorkspaceId)
}
