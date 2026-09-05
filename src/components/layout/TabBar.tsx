import { CheckSquare, FolderKanban, House, Plus, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

const tabs = [
  { to: '/dashboard', label: 'Início', icon: House },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
]

const tabsRight = [
  { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { to: '/profile', label: 'Perfil', icon: User },
]

function TabLink({ to, label, icon: Icon }: (typeof tabs)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
          isActive ? 'text-accent' : 'text-text-faint',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 0 : 2} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function TabBar() {
  const openQuickCreate = useUiStore((s) => s.openQuickCreate)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center border-t border-border-soft bg-base-alt/90 px-2 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1 backdrop-blur-lg">
      {tabs.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}

      <div className="flex flex-1 items-center justify-center">
        <button
          onClick={openQuickCreate}
          aria-label="Criar"
          className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform active:scale-90"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {tabsRight.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}
    </nav>
  )
}
