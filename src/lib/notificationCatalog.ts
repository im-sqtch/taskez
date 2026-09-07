import type { Notification } from '@/types'

// Catálogo de tudo que o app é capaz de notificar. Cada ponto do código que cria
// uma notificação passa a referenciar uma dessas chaves, o que permite ao usuário
// desligar um tipo específico em Configurações (ver notificationPrefsStore).
// O `type` aqui é o que define o ícone/agrupamento na lista de notificações.
export type NotificationEvent =
  | 'task.assigned'
  | 'task.created'
  | 'task.completed'
  | 'task.comment'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.message'
  | 'project.file_added'
  | 'project.file_removed'
  | 'team.member_added'
  | 'team.project_member_added'
  | 'team.contact'
  | 'system.alert'

export type NotificationCategory = 'tasks' | 'projects' | 'team' | 'system'

interface NotificationEventInfo {
  type: Notification['type']
  category: NotificationCategory
  label: string
  description: string
  // Eventos essenciais (falhas que o usuário precisa ver para não achar que a
  // ação deu certo) não podem ser desligados.
  alwaysOn?: boolean
}

export const NOTIFICATION_EVENTS: Record<NotificationEvent, NotificationEventInfo> = {
  'task.assigned': {
    type: 'task',
    category: 'tasks',
    label: 'Tarefa delegada',
    description: 'Quando uma tarefa é atribuída a alguém da equipe.',
  },
  'task.created': {
    type: 'task',
    category: 'tasks',
    label: 'Tarefa criada para você',
    description: 'Quando uma nova tarefa nasce atribuída a você.',
  },
  'task.completed': {
    type: 'task',
    category: 'tasks',
    label: 'Tarefa concluída',
    description: 'Quando uma tarefa é marcada como concluída.',
  },
  'task.comment': {
    type: 'task',
    category: 'tasks',
    label: 'Novo comentário',
    description: 'Quando alguém comenta em uma tarefa.',
  },
  'project.created': {
    type: 'project',
    category: 'projects',
    label: 'Projeto criado',
    description: 'Quando um novo projeto é criado no workspace.',
  },
  'project.updated': {
    type: 'project',
    category: 'projects',
    label: 'Projeto atualizado',
    description: 'Quando nome, prazo, status ou outro dado do projeto muda.',
  },
  'project.deleted': {
    type: 'project',
    category: 'projects',
    label: 'Projeto excluído',
    description: 'Quando um projeto é removido do workspace.',
  },
  'project.message': {
    type: 'project',
    category: 'projects',
    label: 'Mensagem no chat',
    description: 'Quando chega uma mensagem no chat de um projeto.',
  },
  'project.file_added': {
    type: 'project',
    category: 'projects',
    label: 'Novo arquivo',
    description: 'Quando um arquivo é enviado para um projeto.',
  },
  'project.file_removed': {
    type: 'project',
    category: 'projects',
    label: 'Arquivo excluído',
    description: 'Quando um arquivo é removido de um projeto.',
  },
  'team.member_added': {
    type: 'team',
    category: 'team',
    label: 'Novo membro na equipe',
    description: 'Quando alguém entra na equipe do workspace.',
  },
  'team.project_member_added': {
    type: 'team',
    category: 'team',
    label: 'Novo membro no projeto',
    description: 'Quando alguém é adicionado a um projeto.',
  },
  'team.contact': {
    type: 'team',
    category: 'team',
    label: 'Contatos',
    description: 'Quando um convite de contato é aceito.',
  },
  'system.alert': {
    type: 'system',
    category: 'system',
    label: 'Alertas do sistema',
    description: 'Falhas ao salvar uma ação. Sempre ativo.',
    alwaysOn: true,
  },
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  tasks: 'Tarefas',
  projects: 'Projetos',
  team: 'Equipe e contatos',
  system: 'Sistema',
}

export const NOTIFICATION_CATEGORIES = Object.keys(NOTIFICATION_CATEGORY_LABELS) as NotificationCategory[]

export const NOTIFICATION_EVENT_KEYS = Object.keys(NOTIFICATION_EVENTS) as NotificationEvent[]

export function eventsInCategory(category: NotificationCategory): NotificationEvent[] {
  return NOTIFICATION_EVENT_KEYS.filter((key) => NOTIFICATION_EVENTS[key].category === category)
}
