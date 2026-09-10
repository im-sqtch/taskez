import { Bell, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { WorkspaceDropdown } from '@/components/workspace/WorkspaceDropdown'
import { WorkspaceSwitcherSheet } from '@/components/workspace/WorkspaceSwitcherSheet'
import { useAuthStore } from '@/store/authStore'
import { usePendingInvites } from '@/store/contactsStore'
import { useCurrentWorkspace, useWorkspaceNotifications } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'
import { greeting } from '@/lib/utils'

export function DashboardHeader() {
  const user = useAuthStore((s) => s.currentUser())
  const currentWorkspace = useCurrentWorkspace()
  const notifications = useWorkspaceNotifications()
  const pendingInvites = usePendingInvites(user?.id)
  const openSearch = useUiStore((s) => s.openSearch)
  const openNotifications = useUiStore((s) => s.openNotifications)

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length + pendingInvites.length
  const firstName = user?.name.split(' ')[0] ?? ''

  useEffect(() => {
    if (!workspaceMenuOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setWorkspaceMenuOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setWorkspaceMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [workspaceMenuOpen])

  return (
    <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2">
      <div ref={menuRef} className="relative">
        <button onClick={() => setWorkspaceMenuOpen((v) => !v)} className="flex items-center gap-3">
          {user && <Avatar name={user.name} color={user.avatarColor} size="md" />}
          <div className="text-left">
            <p className="text-xs text-text-muted">
              {greeting()}, {firstName}
            </p>
            <p className="font-bold leading-tight text-text">{currentWorkspace?.name}</p>
          </div>
        </button>
        {workspaceMenuOpen && (
          <WorkspaceDropdown
            onClose={() => setWorkspaceMenuOpen(false)}
            onManageWorkspaces={() => setWorkspaceSheetOpen(true)}
          />
        )}
      </div>

      <WorkspaceSwitcherSheet open={workspaceSheetOpen} onClose={() => setWorkspaceSheetOpen(false)} />

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
