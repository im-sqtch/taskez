import { KanbanSquare, ListTodo, Rows3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TaskKanban } from '@/components/tasks/TaskKanban'
import { TaskRow } from '@/components/tasks/TaskRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { TaskStatus } from '@/types'

type ViewMode = 'list' | 'kanban'
type FilterMode = 'all' | 'today' | 'overdue' | 'done'

const filters: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoje' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'done', label: 'Concluídas' },
]

const groupLabels: Record<TaskStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em progresso',
  done: 'Concluídas',
}

export function TasksPage() {
  const tasks = useWorkspaceTasks()
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterMode>('all')

  const filtered = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tasks.filter((t) => {
      if (filter === 'today') {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === today.getTime()
      }
      if (filter === 'overdue') {
        if (!t.dueDate || t.status === 'done') return false
        return new Date(t.dueDate) < today
      }
      if (filter === 'done') return t.status === 'done'
      return true
    })
  }, [tasks, filter])

  const grouped = useMemo(() => {
    const groups: Record<TaskStatus, typeof tasks> = { todo: [], in_progress: [], done: [] }
    filtered.forEach((t) => groups[t.status].push(t))
    return groups
  }, [filtered])

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-2xl font-bold text-text">Tarefas</h1>
        <div className="flex gap-1 rounded-full bg-surface p-1">
          <button
            onClick={() => setView('list')}
            className={cn('flex h-8 w-8 items-center justify-center rounded-full', view === 'list' ? 'bg-accent text-white' : 'text-text-faint')}
            aria-label="Visão em lista"
          >
            <Rows3 size={15} />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={cn('flex h-8 w-8 items-center justify-center rounded-full', view === 'kanban' ? 'bg-accent text-white' : 'text-text-faint')}
            aria-label="Visão Kanban"
          >
            <KanbanSquare size={15} />
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              filter === f.value ? 'bg-accent text-white' : 'bg-surface text-text-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="px-5">
          <EmptyState icon={<ListTodo size={24} />} title="Nenhuma tarefa por aqui" description="Toque no botão + para criar uma nova tarefa." />
        </div>
      ) : view === 'kanban' ? (
        <TaskKanban tasks={filtered} />
      ) : (
        <div className="flex flex-col gap-5 px-5">
          {(['in_progress', 'todo', 'done'] as TaskStatus[]).map((status) =>
            grouped[status].length === 0 ? null : (
              <div key={status} className="flex flex-col gap-1">
                <p className="px-2 text-xs font-bold uppercase tracking-wide text-text-faint">
                  {groupLabels[status]} · {grouped[status].length}
                </p>
                {grouped[status].map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
