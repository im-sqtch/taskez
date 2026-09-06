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

export interface Task {
  id: string
  workspaceId: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  projectId?: string
  dueDate?: string
  assigneeId?: string
  subtasks: Subtask[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
  completedAt?: string
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
  createdAt: string
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
  projectId: string
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
  createdAt: string
}

export interface UserStats {
  streak: number
  tasksCompletedThisWeek: number
  weeklyProductivity: number
}
