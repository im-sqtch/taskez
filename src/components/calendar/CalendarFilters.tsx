import { Check, ListTodo } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'

export interface CalendarFilterProject {
  id: string
  name: string
  color: string
}

interface CalendarFiltersProps {
  projects: CalendarFilterProject[]
  hiddenProjects: Set<string>
  onToggleProject: (id: string) => void
  showCompleted: boolean
  onToggleCompleted: () => void
  hideClosedProjects: boolean
  onToggleHideClosedProjects: () => void
  undatedCount: number
  showUndated: boolean
  onToggleUndated: () => void
  hasActiveFilters: boolean
  onClear: () => void
}

// Filtros do calendário: projetos (caixas na cor de cada um), concluídas e a
// lista de tarefas sem data. Usado na coluna lateral (desktop) e num Sheet (celular).
export function CalendarFilters({ projects, hiddenProjects, onToggleProject, showCompleted, onToggleCompleted, hideClosedProjects, onToggleHideClosedProjects, undatedCount, showUndated, onToggleUndated, hasActiveFilters, onClear }: CalendarFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-text-faint">Meus projetos</h3>
        {projects.map((project) => {
          const visible = !hiddenProjects.has(project.id)
          return (
            <button
              key={project.id}
              type="button"
              role="checkbox"
              aria-checked={visible}
              onClick={() => onToggleProject(project.id)}
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-1 text-left text-sm text-text hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span
                className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2')}
                style={{ borderColor: project.color, backgroundColor: visible ? project.color : 'transparent' }}
                aria-hidden="true"
              >
                {visible && <Check size={12} strokeWidth={3} className="text-white" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border-soft px-1 pt-3">
        <span className="text-sm text-text">Mostrar tarefas concluídas</span>
        <Switch checked={showCompleted} onChange={onToggleCompleted} aria-label="Mostrar tarefas concluídas" />
      </div>
      <div className="-mt-2 flex items-center justify-between gap-3 px-1">
        <span className="text-sm text-text">Ocultar projetos concluídos</span>
        <Switch checked={hideClosedProjects} onChange={onToggleHideClosedProjects} aria-label="Ocultar projetos concluídos" />
      </div>
      <button
        type="button"
        onClick={onToggleUndated}
        aria-pressed={showUndated}
        className={cn('flex min-h-10 items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent', showUndated ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-alt')}
      >
        <ListTodo size={16} aria-hidden="true" />
        <span className="flex-1">Tarefas sem data</span>
        <span className="text-xs font-semibold text-text-muted">{undatedCount}</span>
      </button>
      {hasActiveFilters && <button type="button" className="self-start px-1 text-sm font-semibold text-accent" onClick={onClear}>Limpar filtros</button>}
    </div>
  )
}
