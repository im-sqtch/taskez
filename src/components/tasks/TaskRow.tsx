import { Circle, CircleCheck, ListChecks } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge } from '@/components/ui/Badge'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'
import type { Task } from '@/types'

export function TaskRow({ task }: { task: Task }) {
  const toggleTaskStatus = useDataStore((s) => s.toggleTaskStatus)
  const project = useDataStore((s) => s.projects.find((p) => p.id === task.projectId))
  const navigate = useNavigate()
  const overdue = isOverdue(task.dueDate) && task.status !== 'done'
  const doneSubtasks = task.subtasks.filter((s) => s.done).length

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-alt">
      <button
        onClick={() => toggleTaskStatus(task.id)}
        className={cn('shrink-0 transition-colors', task.status === 'done' ? 'text-success' : 'text-text-faint hover:text-accent')}
        aria-label="Alternar conclusão"
      >
        {task.status === 'done' ? <CircleCheck size={22} fill="currentColor" className="text-success [&>path]:stroke-surface" /> : <Circle size={22} />}
      </button>

      <button onClick={() => navigate(`/tasks/${task.id}`)} className="flex flex-1 flex-col items-start gap-1 text-left min-w-0">
        <p className={cn('text-sm font-medium leading-tight text-text', task.status === 'done' && 'line-through text-text-faint')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {project && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-faint">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </span>
          )}
          {task.dueDate && (
            <span className={cn('text-[11px] font-medium', overdue ? 'text-danger' : 'text-text-faint')}>
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium text-text-faint">
              <ListChecks size={11} /> {doneSubtasks}/{task.subtasks.length}
            </span>
          )}
        </div>
      </button>

      <PriorityBadge priority={task.priority} />
    </div>
  )
}
