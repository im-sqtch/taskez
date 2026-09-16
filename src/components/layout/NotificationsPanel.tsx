import { CheckCheck, X } from 'lucide-react'
import { NotificationsBody } from '@/components/layout/NotificationsBody'
import { useCurrentWorkspaceNotifications, useDataStore } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'

export function NotificationsPanel() {
  const close = useUiStore((s) => s.closeDesktopNotifications)
  const notifications = useCurrentWorkspaceNotifications()
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead)

  return (
    <div className="sticky top-0 flex h-screen w-[360px] shrink-0 flex-col border-r border-border-soft bg-base-alt">
      <div className="flex shrink-0 items-center justify-between px-4 py-4">
        <h2 className="text-lg font-bold text-text">Notificações</h2>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              aria-label="Marcar tudo como lido"
              title="Marcar tudo como lido"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white"
            >
              <CheckCheck size={18} />
            </button>
          )}
          <button
            onClick={close}
            aria-label="Fechar notificações"
            title="Fechar notificações"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <NotificationsBody />
      </div>
    </div>
  )
}
