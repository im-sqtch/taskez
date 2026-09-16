import { CheckCheck, Trash2 } from 'lucide-react'
import { NotificationsBody } from '@/components/layout/NotificationsBody'
import { Sheet } from '@/components/ui/Sheet'
import { confirmAction } from '@/store/confirmStore'
import { useCurrentWorkspaceNotifications, useDataStore } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'

export function NotificationsSheet() {
  const open = useUiStore((s) => s.notificationsOpen)
  const close = useUiStore((s) => s.closeNotifications)
  const notifications = useCurrentWorkspaceNotifications()
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead)
  const deleteAll = useDataStore((s) => s.deleteAllNotifications)

  function handleDeleteAll() {
    confirmAction({
      title: 'Excluir todas as notificações',
      description: 'Excluir todas as notificações? Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir todas',
      danger: true,
      onConfirm: deleteAll,
    })
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Notificações"
      headerAction={
        notifications.length > 0 && (
          <>
            <button
              onClick={markAllRead}
              aria-label="Marcar tudo como lido"
              title="Marcar tudo como lido"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white"
            >
              <CheckCheck size={18} />
            </button>
            <button
              onClick={handleDeleteAll}
              aria-label="Excluir todas as notificações"
              title="Excluir todas as notificações"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger"
            >
              <Trash2 size={18} />
            </button>
          </>
        )
      }
    >
      <NotificationsBody onNavigate={close} />
    </Sheet>
  )
}
