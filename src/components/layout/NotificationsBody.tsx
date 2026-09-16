import { useState } from 'react'
import { Bell, BellDot, Check, FolderKanban, Layers, ListTodo, MoreVertical, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { usePendingInvites, useContactsStore } from '@/store/contactsStore'
import { confirmAction } from '@/store/confirmStore'
import { useCurrentWorkspaceNotifications, useDataStore } from '@/store/dataStore'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const iconByType: Record<Notification['type'], typeof Bell> = {
  task: ListTodo,
  project: FolderKanban,
  team: Users,
  system: Bell,
  workspace: Layers,
}

interface NotificationsBodyProps {
  // Chamado só quando o clique navega pra algum lugar (tarefa/projeto) — o
  // Sheet mobile passa `close` aqui pra fechar o modal; o painel do desktop
  // não passa nada, então continua aberto após navegar.
  onNavigate?: () => void
}

export function NotificationsBody({ onNavigate }: NotificationsBodyProps) {
  const notifications = useCurrentWorkspaceNotifications()
  const markRead = useDataStore((s) => s.markNotificationRead)
  const markUnread = useDataStore((s) => s.markNotificationUnread)
  const deleteNotification = useDataStore((s) => s.deleteNotification)
  const tasks = useDataStore((s) => s.tasks)
  const projects = useDataStore((s) => s.projects)
  const currentUser = useAuthStore((s) => s.currentUser())
  const pendingInvites = usePendingInvites(currentUser?.id)
  const acceptContact = useContactsStore((s) => s.acceptContact)
  const declineContact = useContactsStore((s) => s.declineContact)
  const navigate = useNavigate()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const sorted = [...notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
  const isEmpty = notifications.length === 0 && pendingInvites.length === 0

  // Quando a notificação aponta pra uma tarefa/projeto que já foi excluído,
  // não dá pra simplesmente não fazer nada — o clique visivelmente "não
  // funciona". Em vez disso navega pra uma tela dedicada avisando que aquele
  // item específico não existe mais.
  function handleClick(n: Notification) {
    setOpenMenuId(null)
    markRead(n.id)
    if (n.entityType === 'task') {
      onNavigate?.()
      if (n.entityId && tasks.some((t) => t.id === n.entityId)) navigate(`/tasks/${n.entityId}`)
      else navigate('/notifications/unavailable', { state: { title: n.title } })
    } else if (n.entityType === 'project') {
      onNavigate?.()
      if (n.entityId && projects.some((p) => p.id === n.entityId)) navigate(`/projects/${n.entityId}`)
      else navigate('/notifications/unavailable', { state: { title: n.title } })
    }
  }

  function handleDelete(n: Notification) {
    setOpenMenuId(null)
    confirmAction({
      title: 'Apagar notificação',
      description: `Apagar a notificação "${n.title}"?`,
      confirmLabel: 'Apagar',
      danger: true,
      onConfirm: () => deleteNotification(n.id),
    })
  }

  if (isEmpty) {
    return <EmptyState icon={<Bell size={26} />} title="Nenhuma notificação" description="Você está em dia." />
  }

  return (
    <div className="flex flex-col gap-2">
      {pendingInvites.map(({ contact, fromUser }) => (
        <div key={contact.id} className="flex items-start gap-3 rounded-2xl bg-accent-soft p-3.5">
          <Avatar name={fromUser.name} color={fromUser.avatarColor} size="sm" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">Convite de contato</p>
            <p className="text-sm text-text-muted">{fromUser.name} quer se conectar com você.</p>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => acceptContact(contact.id)}
                className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white"
              >
                <Check size={13} /> Aceitar
              </button>
              <button
                onClick={() => declineContact(contact.id)}
                className="flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-bold text-text-muted"
              >
                <X size={13} /> Recusar
              </button>
            </div>
          </div>
          <UserPlus size={16} className="shrink-0 text-accent" />
        </div>
      ))}

      {sorted.map((n) => {
        const Icon = iconByType[n.type]
        const menuOpen = openMenuId === n.id
        return (
          <div
            key={n.id}
            className={cn('flex items-start gap-3 rounded-2xl p-3.5 transition-colors', n.read ? 'bg-surface' : 'bg-accent-soft')}
          >
            <button onClick={() => handleClick(n)} className="flex flex-1 items-start gap-3 text-left">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  n.read ? 'bg-surface-alt text-text-faint' : 'bg-accent text-white',
                )}
              >
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{n.title}</p>
                <p className="text-sm text-text-muted">{n.body}</p>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-1.5 self-start pt-0.5">
              {menuOpen && (
                <>
                  <button
                    onClick={() => {
                      setOpenMenuId(null)
                      markUnread(n.id)
                    }}
                    aria-label="Marcar como não lida"
                    title="Marcar como não lida"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-alt text-text-muted"
                  >
                    <BellDot size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(n)}
                    aria-label="Apagar notificação"
                    title="Apagar notificação"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-danger-soft text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpenMenuId(menuOpen ? null : n.id)}
                aria-label="Mais opções"
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-faint hover:text-text-muted"
              >
                <MoreVertical size={15} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
