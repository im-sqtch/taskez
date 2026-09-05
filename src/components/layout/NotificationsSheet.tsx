import { Bell, CheckCheck, FolderKanban, Layers, ListTodo, Users } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/EmptyState'
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
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead)

  const sorted = [...notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))

  return (
    <Sheet open={open} onClose={close} title="Notificações">
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={26} />} title="Nenhuma notificação" description="Você está em dia." />
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={markAllRead}
            className="mb-1 flex items-center gap-1.5 self-end text-xs font-semibold text-accent"
          >
            <CheckCheck size={14} /> Marcar tudo como lido
          </button>
          {sorted.map((n) => {
            const Icon = iconByType[n.type]
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  'flex items-start gap-3 rounded-2xl p-3.5 text-left transition-colors',
                  n.read ? 'bg-surface' : 'bg-accent-soft',
                )}
              >
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
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
