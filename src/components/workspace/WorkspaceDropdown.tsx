import { Check, Layers, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'

interface WorkspaceDropdownProps {
  onClose: () => void
  onManageWorkspaces: () => void
}

export function WorkspaceDropdown({ onClose, onManageWorkspaces }: WorkspaceDropdownProps) {
  const workspaces = useDataStore((s) => s.workspaces)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  const switchWorkspace = useDataStore((s) => s.switchWorkspace)

  return (
    <div
      role="menu"
      className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
    >
      <div className="max-h-72 overflow-y-auto p-1.5">
        {workspaces.map((w) => {
          const isCurrent = w.id === currentWorkspaceId
          return (
            <button
              key={w.id}
              role="menuitem"
              onClick={() => {
                if (!isCurrent) switchWorkspace(w.id)
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors',
                isCurrent ? 'bg-accent-soft' : 'hover:bg-surface-alt',
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: w.color }}>
                <Layers size={14} />
              </div>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{w.name}</p>
              {isCurrent && <Check size={16} className="shrink-0 text-accent" />}
            </button>
          )
        })}
      </div>
      <div className="border-t border-border p-1.5">
        <button
          role="menuitem"
          onClick={() => {
            onManageWorkspaces()
            onClose()
          }}
          className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-text-muted transition-colors hover:bg-surface-alt hover:text-accent"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
            <Settings size={14} />
          </div>
          <p className="text-sm font-semibold">Gerenciar workspaces</p>
        </button>
      </div>
    </div>
  )
}
