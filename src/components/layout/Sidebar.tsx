import {
  Bell,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  House,
  Paperclip,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { WorkspaceSwitcherSheet } from '@/components/workspace/WorkspaceSwitcherSheet'
import { useAuthStore } from '@/store/authStore'
import { usePendingInvites } from '@/store/contactsStore'
import { useCurrentWorkspace, useCurrentWorkspaceNotifications } from '@/store/dataStore'
import { useLayoutStore } from '@/store/layoutStore'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const secondaryNav = [
  { to: '/profile', label: 'Perfil', icon: User },
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/trash', label: 'Lixeira', icon: Trash2 },
]

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  collapsed: boolean
  to?: string
  onClick?: () => void
  active?: boolean
  badge?: boolean
}

function SidebarItem({ icon: Icon, label, collapsed, to, onClick, active, badge }: SidebarItemProps) {
  const content = (
    <>
      <span className="relative shrink-0">
        <Icon size={19} strokeWidth={2} />
        {badge && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-base-alt" />}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  )

  const className = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
      collapsed && 'justify-center px-0',
      isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text',
    )

  if (to) {
    return (
      <NavLink to={to} title={collapsed ? label : undefined} onClick={onClick} className={({ isActive }) => className(isActive)}>
        {content}
      </NavLink>
    )
  }

  return (
    <button type="button" onClick={onClick} title={collapsed ? label : undefined} className={className(Boolean(active))}>
      {content}
    </button>
  )
}

export function Sidebar() {
  const user = useAuthStore((s) => s.currentUser())
  const currentWorkspace = useCurrentWorkspace()
  const openQuickCreate = useUiStore((s) => s.openQuickCreate)
  const openSearch = useUiStore((s) => s.openSearch)
  const desktopNotificationsOpen = useUiStore((s) => s.desktopNotificationsOpen)
  const toggleDesktopNotifications = useUiStore((s) => s.toggleDesktopNotifications)
  const closeDesktopNotifications = useUiStore((s) => s.closeDesktopNotifications)
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)

  const notifications = useCurrentWorkspaceNotifications()
  const pendingInvites = usePendingInvites(user?.id)
  const unreadCount = notifications.filter((n) => !n.read).length + pendingInvites.length

  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false)

  // Navegar pra qualquer outro item da sidebar fecha o painel de notificações
  // encaixado — ele só fica aberto "por cima" enquanto o usuário não troca de
  // seção pela própria sidebar.
  function handleNavigate() {
    closeDesktopNotifications()
  }

  function handleSearch() {
    closeDesktopNotifications()
    openSearch()
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-soft bg-base-alt transition-[width] duration-150',
        collapsed ? 'w-[76px] items-center px-2' : 'w-64 px-3',
        'py-4',
      )}
    >
      <div className={cn('relative w-full', collapsed ? 'flex justify-center' : '')}>
        <button
          onClick={() => setWorkspaceSheetOpen(true)}
          className={cn(
            'flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface-alt',
            collapsed ? 'justify-center' : 'w-full text-left',
          )}
        >
          {user && <Avatar name={user.name} color={user.avatarColor} size="md" />}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-text-muted">Workspace</p>
              <p className="truncate font-bold leading-tight text-text">{currentWorkspace?.name}</p>
            </div>
          )}
        </button>
      </div>

      <WorkspaceSwitcherSheet open={workspaceSheetOpen} onClose={() => setWorkspaceSheetOpen(false)} />

      <button
        onClick={openQuickCreate}
        title={collapsed ? 'Criar' : undefined}
        className={cn(
          'mt-4 flex items-center gap-2 rounded-xl bg-accent font-semibold text-white shadow-md shadow-accent/20 transition-transform active:scale-95',
          collapsed ? 'h-11 w-11 justify-center' : 'w-full justify-center px-4 py-2.5 text-sm',
        )}
      >
        <Plus size={18} strokeWidth={2.5} />
        {!collapsed && <span>Criar</span>}
      </button>

      <nav className="mt-6 flex w-full flex-1 flex-col gap-1 overflow-y-auto">
        <SidebarItem label="Pesquisar" icon={Search} collapsed={collapsed} onClick={handleSearch} />
        <SidebarItem to="/dashboard" label="Início" icon={House} collapsed={collapsed} onClick={handleNavigate} />
        <SidebarItem to="/projects" label="Projetos" icon={FolderKanban} collapsed={collapsed} onClick={handleNavigate} />
        <SidebarItem to="/tasks" label="Tarefas" icon={CheckSquare} collapsed={collapsed} onClick={handleNavigate} />
        <SidebarItem to="/files" label="Arquivos" icon={Paperclip} collapsed={collapsed} onClick={handleNavigate} />
        <SidebarItem
          label="Notificações"
          icon={Bell}
          collapsed={collapsed}
          active={desktopNotificationsOpen}
          badge={unreadCount > 0}
          onClick={toggleDesktopNotifications}
        />

        <div className={cn('my-2 border-t border-border-soft', collapsed && 'w-8 self-center')} />

        {secondaryNav.map((item) => (
          <SidebarItem key={item.to} {...item} collapsed={collapsed} onClick={handleNavigate} />
        ))}
      </nav>

      <button
        onClick={toggleSidebar}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-text-faint transition-colors hover:bg-surface-alt hover:text-text',
          collapsed ? 'justify-center px-0' : 'w-full',
        )}
      >
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        {!collapsed && <span>Recolher</span>}
      </button>
    </aside>
  )
}
