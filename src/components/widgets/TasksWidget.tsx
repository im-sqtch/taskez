import { Circle, ListTodo } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, isOverdue } from '@/lib/utils'
import { useDataStore, useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

const LIMIT_BY_SIZE: Record<WidgetSize, number> = { S: 0, M: 4, L: 8 }

export function TasksWidget({ size }: { size: WidgetSize }) {
  const tasks = useWorkspaceTasks()
  const toggleTaskStatus = useDataStore((s) => s.toggleTaskStatus)
  const navigate = useNavigate()

  const pending = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
      return aDue - bDue
    })

  if (size === 'S') {
    return (
      <Card className="flex items-center justify-between" onClick={() => navigate('/tasks')}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ListTodo size={16} />
          </div>
          <p className="font-semibold text-text">Tarefas do dia</p>
        </div>
        <p className="text-lg font-bold text-text">{pending.length}</p>
      </Card>
    )
  }

  const upcoming = pending.slice(0, LIMIT_BY_SIZE[size])

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text">Próximas tarefas</h3>
        <button onClick={() => navigate('/tasks')} className="text-sm font-semibold text-accent">
          Ver todas
        </button>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState icon={<ListTodo size={22} />} title="Nenhuma tarefa pendente" />
      ) : (
        <div className="flex flex-col gap-1">
          {upcoming.map((t) => {
            const overdue = isOverdue(t.dueDate)
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-surface-alt">
                <button
                  onClick={() => toggleTaskStatus(t.id)}
                  className="shrink-0 text-text-faint transition-colors hover:text-accent"
                  aria-label="Concluir tarefa"
                >
                  <Circle size={20} />
                </button>
                <button onClick={() => navigate(`/tasks/${t.id}`)} className="flex-1 text-left">
                  <p className="text-sm font-medium leading-tight text-text">{t.title}</p>
                </button>
                {t.dueDate && (
                  <span className={overdue ? 'text-xs font-semibold text-danger' : 'text-xs text-text-faint'}>
                    {formatDate(t.dueDate)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
