import {
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  House,
  Paperclip,
  Plus,
  Settings,
  Trash2,
  User,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { WorkspaceDropdown } from '@/components/workspace/WorkspaceDropdown'
import { WorkspaceSwitcherSheet } from '@/components/workspace/WorkspaceSwitcherSheet'
import { useAuthStore } from '@/store/authStore'
import { useCurrentWorkspace } from '@/store/dataStore'
import { useLayoutStore } from '@/store/layoutStore'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const mainNav = [
  { to: '/dashboard', label: 'Início', icon: House },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { to: '/files', label: 'Arquivos', icon: Paperclip },
]

const secondaryNav = [
  { to: '/profile', label: 'Perfil', icon: User },
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/trash', label: 'Lixeira', icon: Trash2 },
]

function NavItem({ to, label, icon: Icon, collapsed }: (typeof mainNav)[number] & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text',
        )
      }
    >
      <Icon size={19} strokeWidth={2} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export function Sidebar() {
  const user = useAuthStore((s) => s.currentUser())
  const currentWorkspace = useCurrentWorkspace()
  const openQuickCreate = useUiStore((s) => s.openQuickCreate)
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-soft bg-base-alt transition-[width] duration-150',
        collapsed ? 'w-[76px] items-center px-2' : 'w-64 px-3',
        'py-4',
      )}
    >
      <div ref={menuRef} className={cn('relative w-full', collapsed ? 'flex justify-center' : '')}>
        <button
          onClick={() => setWorkspaceMenuOpen((v) => !v)}
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
        {workspaceMenuOpen && !collapsed && (
          <WorkspaceDropdown
            onClose={() => setWorkspaceMenuOpen(false)}
            onManageWorkspaces={() => setWorkspaceSheetOpen(true)}
          />
        )}
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
        {mainNav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
        <div className={cn('my-2 border-t border-border-soft', collapsed && 'w-8 self-center')} />
        {secondaryNav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
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
