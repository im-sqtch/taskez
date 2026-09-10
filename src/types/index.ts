export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type ProjectStatus = 'active' | 'completed' | 'archived'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Comment {
  id: string
  authorId: string
  text: string
  createdAt: string
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  // 'weekly': dias da semana em que um novo ciclo nasce (0=domingo..6=sábado).
  weekdays?: number[]
  // 'monthly': dia do mês em que um novo ciclo nasce (1-31, clampado no
  // último dia em meses mais curtos).
  dayOfMonth?: number
  // Data (ISO) a partir da qual a série para de gerar novos ciclos.
  endDate?: string
}

export interface Task {
  id: string
  workspaceId: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  projectId?: string
  dueDate?: string
  assigneeIds: string[]
  subtasks: Subtask[]
  comments: Comment[]
  links: string[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  // Ordem manual dentro do projeto (ou da lista de avulsas do workspace,
  // quando sem projeto) — definida na sheet de reordenar.
  order: number
  // Só é considerada quando a tarefa não pertence a um projeto — dentro de um
  // projeto recorrente, a cadência é a do projeto (ver RecurrenceRule).
  recurrence?: RecurrenceRule
  // Identifica a série de ciclos gerados a partir desta tarefa/projeto — só a
  // store mexe nisto, nunca é exposto na UI.
  seriesId?: string
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string
  color: string
  icon?: string
  status: ProjectStatus
  dueDate?: string
  memberIds: string[]
  links: string[]
  createdAt: string
  order: number
  completionAck: boolean
  recurrence?: RecurrenceRule
  seriesId?: string
}

export interface TeamMember {
  id: string
  workspaceId: string
  name: string
  role: string
  avatarColor: string
  status: 'online' | 'away' | 'offline'
  workload: number
  // Marca a entrada que representa o usuário real logado (não os colegas fictícios)
  // dentro do roster daquele workspace — evita depender de um id fixo tipo 'team-1',
  // que deixou de ser único quando cada workspace passou a ter seu próprio roster.
  isSelf?: boolean
  // Presente quando este membro veio de um contato aceito (conta real do sistema),
  // referenciando o User correspondente — distingue de colegas fictícios de seed.
  linkedUserId?: string
}

export interface Contact {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted'
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  projectId: string
  authorId: string
  text: string
  createdAt: string
}

export interface ProjectFile {
  id: string
  workspaceId: string
  projectIds: string[]
  name: string
  size: number
  type: string
  storagePath: string
  uploadedBy: string
  createdAt: string
}

export interface Notification {
  id: string
  // Ausente para notificações de conta (ex.: contato aceitou convite) — não pertencem
  // a nenhum workspace específico, então aparecem independentemente de qual está ativo.
  workspaceId?: string
  title: string
  body: string
  read: boolean
  createdAt: string
  type: 'task' | 'project' | 'team' | 'system' | 'workspace'
  // Presentes quando a notificação se refere a uma tarefa ou projeto específico —
  // usados para levar o usuário até a página correspondente ao clicar. Ausentes
  // para eventos sem destino próprio (ex.: novo membro na equipe) ou cuja entidade
  // foi excluída (ex.: projeto excluído).
  entityType?: 'task' | 'project'
  entityId?: string
}

export type WidgetType =
  | 'summary'
  | 'tasks'
  | 'calendar'
  | 'projects'
  | 'profile'
  | 'team'
  | 'shortcuts'
  | 'utility'

export type WidgetSize = 'S' | 'M' | 'L'

export interface DashboardWidget {
  id: string
  type: WidgetType
  size: WidgetSize
  visible: boolean
  order: number
}

export interface DashboardLayout {
  widgets: DashboardWidget[]
}

export type UsageMode = 'personal' | 'team' | 'client'

export interface User {
  id: string
  name: string
  email: string
  avatarColor: string
  usageMode: UsageMode
  timezone: string
  // Configurações > Tarefas concluídas: false pergunta (padrão atual), true
  // conclui o projeto automaticamente quando todas as tarefas terminam.
  autoCompleteProjects: boolean
  createdAt: string
}

export interface UserStats {
  streak: number
  tasksCompletedThisWeek: number
  weeklyProductivity: number
}
