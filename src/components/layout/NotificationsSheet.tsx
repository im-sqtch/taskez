import { CheckCheck } from 'lucide-react'
import { NotificationsBody } from '@/components/layout/NotificationsBody'
import { Sheet } from '@/components/ui/Sheet'
import { useCurrentWorkspaceNotifications, useDataStore } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'

export function NotificationsSheet() {
  const open = useUiStore((s) => s.notificationsOpen)
  const close = useUiStore((s) => s.closeNotifications)
  const notifications = useCurrentWorkspaceNotifications()
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead)

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Notificações"
      headerAction={
        notifications.length > 0 && (
          <button
            onClick={markAllRead}
            aria-label="Marcar tudo como lido"
            title="Marcar tudo como lido"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white"
          >
            <CheckCheck size={18} />
          </button>
        )
      }
    >
      <NotificationsBody onNavigate={close} />
    </Sheet>
  )
}
