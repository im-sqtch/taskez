import { useEffect, useState } from 'react'
import { Bell, BellDot, Check, CheckCheck, FolderKanban, Layers, ListTodo, MoreVertical, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { usePendingInvites, useContactsStore } from '@/store/contactsStore'
import { useDataStore, useWorkspaceNotifications } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const iconByType: Record<Notification['type'], typeof Bell> = {
  task: ListTodo,
  project: FolderKanban,
  team: Users,
  system: Bell,
  workspace: Layers,
}

export function NotificationsSheet() {
  const open = useUiStore((s) => s.notificationsOpen)
  const close = useUiStore((s) => s.closeNotifications)
  const notifications = useWorkspaceNotifications()
  const markRead = useDataStore((s) => s.markNotificationRead)
  const markUnread = useDataStore((s) => s.markNotificationUnread)
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead)
  const deleteNotification = useDataStore((s) => s.deleteNotification)
  const tasks = useDataStore((s) => s.tasks)
  const projects = useDataStore((s) => s.projects)
  const currentUser = useAuthStore((s) => s.currentUser())
  const pendingInvites = usePendingInvites(currentUser?.id)
  const acceptContact = useContactsStore((s) => s.acceptContact)
  const declineContact = useContactsStore((s) => s.declineContact)
  const navigate = useNavigate()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setOpenMenuId(null)
  }, [open])

  const sorted = [...notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
  const isEmpty = notifications.length === 0 && pendingInvites.length === 0

  // Só navega se a entidade referenciada ainda existir — notificações de tarefa/
  // projeto excluído, por exemplo, não têm entityId e ficam sem destino.
  function handleClick(n: Notification) {
    setOpenMenuId(null)
    markRead(n.id)
    if (n.entityType === 'task' && n.entityId && tasks.some((t) => t.id === n.entityId)) {
      close()
      navigate(`/tasks/${n.entityId}`)
    } else if (n.entityType === 'project' && n.entityId && projects.some((p) => p.id === n.entityId)) {
      close()
      navigate(`/projects/${n.entityId}`)
    }
  }

  function handleDelete(n: Notification) {
    setOpenMenuId(null)
    if (confirm(`Apagar a notificação "${n.title}"?`)) deleteNotification(n.id)
  }

  return (
    <Sheet open={open} onClose={close} title="Notificações">
      {isEmpty ? (
        <EmptyState icon={<Bell size={26} />} title="Nenhuma notificação" description="Você está em dia." />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="mb-1 flex items-center gap-1.5 self-end text-xs font-semibold text-accent"
            >
              <CheckCheck size={14} /> Marcar tudo como lido
            </button>
          )}

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
      )}
    </Sheet>
  )
}
