import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { WorkspaceSwitcherSheet } from '@/components/workspace/WorkspaceSwitcherSheet'
import { useAuthStore } from '@/store/authStore'
import { usePendingInvites } from '@/store/contactsStore'
import { useCurrentWorkspace, useCurrentWorkspaceNotifications } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'
import { greeting } from '@/lib/utils'

export function DashboardHeader() {
  const user = useAuthStore((s) => s.currentUser())
  const currentWorkspace = useCurrentWorkspace()
  const notifications = useCurrentWorkspaceNotifications()
  const pendingInvites = usePendingInvites(user?.id)
  const openNotifications = useUiStore((s) => s.openNotifications)

  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length + pendingInvites.length
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2">
      <div>
        <button onClick={() => setWorkspaceSheetOpen(true)} className="flex items-center gap-3">
          {user && <Avatar name={user.name} color={user.avatarColor} size="md" />}
          <div className="text-left">
            <p className="text-xs text-text-muted">
              {greeting()}, {firstName}
            </p>
            <p className="font-bold leading-tight text-text">{currentWorkspace?.name}</p>
          </div>
        </button>
      </div>

      <WorkspaceSwitcherSheet open={workspaceSheetOpen} onClose={() => setWorkspaceSheetOpen(false)} />

      <div className="flex items-center gap-2">
        <button
          onClick={openNotifications}
          aria-label="Notificações"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text lg:hidden"
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
