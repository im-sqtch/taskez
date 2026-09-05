import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
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
const daysFromNow = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}
const minutesAgo = (n: number) => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - n)
  return d.toISOString()
}

const DEFAULT_WORKSPACE_ID = 'ws-1'
const WORKSPACE_COLORS = ['#7C5CFF', '#3B9EFF', '#34D399', '#F5A524', '#F5455C', '#FF7CE0']

function getSelfMember(team: TeamMember[]): TeamMember | undefined {
  return team.find((m) => m.isSelf)
}

function seedWorkspaces(): Workspace[] {
  return [{ id: DEFAULT_WORKSPACE_ID, name: 'TaskEz HQ', color: WORKSPACE_COLORS[0]!, createdAt: now() }]
}

function seedProjects(): Project[] {
  return [
    {
      id: 'proj-1',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Rebranding Aurora',
      description: 'Nova identidade visual e site institucional.',
      color: '#7C5CFF',
      status: 'active',
      dueDate: daysFromNow(12),
      memberIds: ['team-1', 'team-2'],
      createdAt: now(),
    },
    {
      id: 'proj-2',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'App Mobile Fintech',
      description: 'MVP do aplicativo de carteira digital.',
      color: '#3B9EFF',
      status: 'active',
      dueDate: daysFromNow(5),
      memberIds: ['team-1', 'team-3'],
      createdAt: now(),
    },
    {
      id: 'proj-3',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Campanha Q3',
      description: 'Planejamento de marketing do terceiro trimestre.',
      color: '#34D399',
      status: 'completed',
      dueDate: daysFromNow(-3),
      memberIds: ['team-2'],
      createdAt: now(),
    },
  ]
}

function seedTasks(): Task[] {
  const mk = (
    title: string,
    status: TaskStatus,
    priority: Priority,
    projectId?: string,
    due?: number,
    subtasks: string[] = [],
  ): Task => ({
    id: uuid(),
    workspaceId: DEFAULT_WORKSPACE_ID,
    title,
    status,
    priority,
    projectId,
    dueDate: due !== undefined ? daysFromNow(due) : undefined,
    subtasks: subtasks.map((t) => ({ id: uuid(), title: t, done: Math.random() > 0.6 })),
    comments: [],
    createdAt: now(),
    updatedAt: now(),
    completedAt: status === 'done' ? now() : undefined,
  })

  return [
    mk('Definir paleta de cores', 'done', 'medium', 'proj-1', -2, ['Pesquisar referências', 'Validar acessibilidade']),
    mk('Wireframes da home', 'in_progress', 'high', 'proj-1', 1, ['Desktop', 'Mobile']),
    mk('Revisar copy do site', 'todo', 'low', 'proj-1', 6),
    mk('Configurar autenticação', 'in_progress', 'urgent', 'proj-2', 0, ['OAuth', 'Recuperação de senha']),
    mk('Tela de onboarding', 'todo', 'high', 'proj-2', 3),
    mk('Testes de carga', 'todo', 'medium', 'proj-2', 8),
    mk('Relatório final Q3', 'done', 'medium', 'proj-3', -5),
    mk('Organizar mesa de trabalho', 'todo', 'low', undefined, 2),
    mk('Ligar para o contador', 'todo', 'medium', undefined, 0),
  ]
}

function seedTeam(): TeamMember[] {
  return [
    { id: 'team-1', workspaceId: DEFAULT_WORKSPACE_ID, name: 'Você', role: 'Product Designer', avatarColor: '#7C5CFF', status: 'online', workload: 68, isSelf: true },
    { id: 'team-2', workspaceId: DEFAULT_WORKSPACE_ID, name: 'Marina Alves', role: 'UI Designer', avatarColor: '#F5A524', status: 'online', workload: 82 },
    { id: 'team-3', workspaceId: DEFAULT_WORKSPACE_ID, name: 'Rafael Souza', role: 'Dev Frontend', avatarColor: '#3B9EFF', status: 'away', workload: 45 },
    { id: 'team-4', workspaceId: DEFAULT_WORKSPACE_ID, name: 'Bianca Lima', role: 'Dev Backend', avatarColor: '#34D399', status: 'offline', workload: 30 },
  ]
}

function seedNotifications(): Notification[] {
  return [
    {
      id: uuid(),
      workspaceId: DEFAULT_WORKSPACE_ID,
      title: 'Bem-vindo ao TaskEz',
      body: 'Monte seu dashboard do jeito que quiser.',
      read: true,
      createdAt: now(),
      type: 'system',
    },
  ]
}

// A partir daqui, notificações reais são geradas pelas próprias actions (tarefa
// concluída, delegada, comentada; membro convidado; arquivo enviado; mensagem no
// chat; workspace criado) — não são mais só dados de exemplo fixos.
function makeNotification(workspaceId: string, type: Notification['type'], title: string, body: string): Notification {
  return { id: uuid(), workspaceId, title, body, read: false, createdAt: now(), type }
}

function seedChatMessages(): ChatMessage[] {
  return [
    { id: uuid(), projectId: 'proj-1', authorId: 'team-2', text: 'Pessoal, já defini a paleta final. Dá uma olhada quando puder!', createdAt: minutesAgo(180) },
    { id: uuid(), projectId: 'proj-1', authorId: 'team-1', text: 'Ficou ótima! Já posso seguir com os wireframes usando essas cores.', createdAt: minutesAgo(170) },
    { id: uuid(), projectId: 'proj-1', authorId: 'team-2', text: 'Combinado. Te aviso quando o moodboard estiver pronto.', createdAt: minutesAgo(160) },
    { id: uuid(), projectId: 'proj-2', authorId: 'team-3', text: 'Consegui subir o fluxo de OAuth em homologação.', createdAt: minutesAgo(90) },
    { id: uuid(), projectId: 'proj-2', authorId: 'team-1', text: 'Show! Vou testar o login social ainda hoje.', createdAt: minutesAgo(80) },
  ]
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
  seeded: boolean
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

  seedIfEmpty: () => void
  migrateProfileSizeIfNeeded: () => void

  // Workspaces
  addWorkspace: (name: string, color: string) => string
  switchWorkspace: (id: string) => void
  renameWorkspace: (id: string, name: string) => void
  deleteWorkspace: (id: string) => void

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
  markAllNotificationsRead: () => void

  // Dashboard layout
  setLayout: (layout: DashboardLayout) => void
  resetLayout: () => void
  toggleWidgetVisible: (widgetId: string) => void
  resizeWidget: (widgetId: string, size: 'S' | 'M' | 'L') => void
  reorderWidgets: (orderedIds: string[]) => void
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      seeded: false,
      profileSizeMigrated: false,
      workspaces: [],
      currentWorkspaceId: DEFAULT_WORKSPACE_ID,
      projects: [],
      tasks: [],
      team: [],
      notifications: [],
      chatMessages: [],
      files: [],
      layout: defaultLayout(),

      seedIfEmpty: () => {
        if (get().seeded) return
        set({
          seeded: true,
          profileSizeMigrated: true,
          workspaces: seedWorkspaces(),
          currentWorkspaceId: DEFAULT_WORKSPACE_ID,
          projects: seedProjects(),
          tasks: seedTasks(),
          team: seedTeam(),
          notifications: seedNotifications(),
          chatMessages: seedChatMessages(),
          files: [],
          layout: defaultLayout(),
        })
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
        set((state) => {
          const currentTeam = state.team.filter((m) => m.workspaceId === state.currentWorkspaceId)
          const copiedTeam: TeamMember[] = currentTeam.map((m) => ({ ...m, id: uuid(), workspaceId: id }))
          return {
            workspaces: [...state.workspaces, { id, name: name.trim(), color, createdAt: now() }],
            team: [...state.team, ...copiedTeam],
            currentWorkspaceId: id,
            notifications: [
              ...state.notifications,
              makeNotification(id, 'workspace', 'Workspace criado', `"${name.trim()}" está pronto para uso.`),
            ],
          }
        })
        return id
      },
      switchWorkspace: (id) => set({ currentWorkspaceId: id }),
      renameWorkspace: (id, name) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, name: name.trim() } : w)),
        })),
      deleteWorkspace: (id) =>
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
        }),

      addProject: (data) => {
        const id = uuid()
        set((state) => ({
          projects: [...state.projects, { ...data, id, workspaceId: state.currentWorkspaceId, createdAt: now() }],
        }))
        return id
      },
      updateProject: (id, patch) =>
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
                  makeNotification(project.workspaceId, 'team', 'Novo membro no projeto', `${member.name} foi adicionado a "${project.name}".`),
                )
              }
            }
          }
          return {
            projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            notifications,
          }
        }),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          tasks: state.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
          chatMessages: state.chatMessages.filter((m) => m.projectId !== id),
          files: state.files.filter((f) => f.projectId !== id),
        })),
      addChatMessage: (projectId, authorId, text) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === projectId)
          const preview = text.length > 60 ? `${text.slice(0, 57)}...` : text
          return {
            chatMessages: [...state.chatMessages, { id: uuid(), projectId, authorId, text, createdAt: now() }],
            notifications: project
              ? [...state.notifications, makeNotification(project.workspaceId, 'project', `Nova mensagem em ${project.name}`, preview)]
              : state.notifications,
          }
        }),
      addFile: (data) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === data.projectId)
          return {
            files: [...state.files, { ...data, id: uuid(), createdAt: now() }],
            notifications: project
              ? [...state.notifications, makeNotification(project.workspaceId, 'project', 'Novo arquivo', `"${data.name}" foi enviado em "${project.name}".`)]
              : state.notifications,
          }
        }),
      removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

      addTask: (data) => {
        const id = uuid()
        set((state) => {
          const task: Task = {
            id,
            workspaceId: state.currentWorkspaceId,
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
          const selfId = getSelfMember(state.team.filter((m) => m.workspaceId === state.currentWorkspaceId))?.id
          const member = task.assigneeId && task.assigneeId !== selfId ? state.team.find((m) => m.id === task.assigneeId) : undefined
          return {
            tasks: [...state.tasks, task],
            notifications: member
              ? [...state.notifications, makeNotification(state.currentWorkspaceId, 'task', 'Tarefa delegada', `"${task.title}" foi delegada para ${member.name}.`)]
              : state.notifications,
          }
        })
        return id
      },
      updateTask: (id, patch) =>
        set((state) => {
          const existing = state.tasks.find((t) => t.id === id)
          const notifications = [...state.notifications]
          if (existing) {
            const selfId = getSelfMember(state.team.filter((m) => m.workspaceId === existing.workspaceId))?.id
            if (patch.assigneeId && patch.assigneeId !== existing.assigneeId && patch.assigneeId !== selfId) {
              const member = state.team.find((m) => m.id === patch.assigneeId)
              if (member) {
                notifications.push(makeNotification(existing.workspaceId, 'task', 'Tarefa delegada', `"${existing.title}" foi delegada para ${member.name}.`))
              }
            }
          }
          return {
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)),
            notifications,
          }
        }),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      toggleTaskStatus: (id) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          if (!task) return {}
          const becomingDone = task.status !== 'done'
          const status: TaskStatus = becomingDone ? 'done' : 'todo'
          return {
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, status, completedAt: status === 'done' ? now() : undefined, updatedAt: now() } : t,
            ),
            notifications: becomingDone
              ? [...state.notifications, makeNotification(task.workspaceId, 'task', 'Tarefa concluída', `"${task.title}" foi concluída.`)]
              : state.notifications,
          }
        }),
      setTaskStatus: (id, status) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          const becomingDone = !!task && task.status !== 'done' && status === 'done'
          return {
            tasks: state.tasks.map((t) =>
              t.id === id
                ? { ...t, status, completedAt: status === 'done' ? now() : undefined, updatedAt: now() }
                : t,
            ),
            notifications:
              becomingDone && task
                ? [...state.notifications, makeNotification(task.workspaceId, 'task', 'Tarefa concluída', `"${task.title}" foi concluída.`)]
                : state.notifications,
          }
        }),
      addSubtask: (taskId, title) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: [...t.subtasks, { id: uuid(), title, done: false } as Subtask], updatedAt: now() }
              : t,
          ),
        })),
      toggleSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
                  updatedAt: now(),
                }
              : t,
          ),
        })),
      removeSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t,
          ),
        })),
      addComment: (taskId, authorId, text) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          return {
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    comments: [...t.comments, { id: uuid(), authorId, text, createdAt: now() }],
                    updatedAt: now(),
                  }
                : t,
            ),
            notifications: task
              ? [...state.notifications, makeNotification(task.workspaceId, 'task', 'Novo comentário', `Comentário em "${task.title}".`)]
              : state.notifications,
          }
        }),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.workspaceId === state.currentWorkspaceId ? { ...n, read: true } : n,
          ),
        })),

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
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Seguro rodar em toda hidratação: só recalcula com base no catálogo atual,
        // sem depender de flags (idempotente, ao contrário de migrateProfileSizeIfNeeded).
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
  return notifications.filter((n) => n.workspaceId === currentWorkspaceId)
}

export function useCurrentWorkspace() {
  const workspaces = useDataStore((s) => s.workspaces)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  return workspaces.find((w) => w.id === currentWorkspaceId)
}
