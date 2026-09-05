import { Bell, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/authStore'
import { usePendingInvites } from '@/store/contactsStore'
import { useWorkspaceNotifications } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'
import { greeting } from '@/lib/utils'

export function DashboardHeader() {
  const user = useAuthStore((s) => s.currentUser())
  const notifications = useWorkspaceNotifications()
  const pendingInvites = usePendingInvites(user?.id)
  const openSearch = useUiStore((s) => s.openSearch)
  const openNotifications = useUiStore((s) => s.openNotifications)
  const navigate = useNavigate()

  const unreadCount = notifications.filter((n) => !n.read).length + pendingInvites.length
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-3">
        {user && <Avatar name={user.name} color={user.avatarColor} size="md" />}
        <div className="text-left">
          <p className="text-xs text-text-muted">{greeting()},</p>
          <p className="font-bold leading-tight text-text">{firstName}</p>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={openSearch}
          aria-label="Buscar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
        >
          <Search size={19} />
        </button>
        <button
          onClick={openNotifications}
          aria-label="Notificações"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </button>
      </div>
    </header>
  )
}
