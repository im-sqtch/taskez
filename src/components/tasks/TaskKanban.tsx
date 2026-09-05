import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { PriorityBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'
import type { Task, TaskStatus } from '@/types'
import { useNavigate } from 'react-router-dom'

const columns: { key: TaskStatus; label: string; dotColor: string }[] = [
  { key: 'todo', label: 'A fazer', dotColor: 'bg-text-faint' },
  { key: 'in_progress', label: 'Em progresso', dotColor: 'bg-accent' },
  { key: 'done', label: 'Concluída', dotColor: 'bg-success' },
]

function KanbanCard({ task }: { task: Task }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && navigate(`/tasks/${task.id}`)}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
          : undefined
      }
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border-soft bg-surface p-3 text-left cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-70 shadow-lg',
      )}
    >
      <p className="text-sm font-medium text-text">{task.title}</p>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.subtasks.length > 0 && (
          <span className="text-[11px] text-text-faint">
            {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ status, label, dotColor, tasks }: { status: TaskStatus; label: string; dotColor: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col gap-2.5 rounded-xl bg-surface-alt/50 p-2.5 transition-colors',
        isOver && 'bg-accent-soft',
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <span className={cn('h-2 w-2 rounded-full', dotColor)} />
        <p className="text-sm font-bold text-text">{label}</p>
        <span className="text-xs text-text-faint">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-16">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  )
}

export function TaskKanban({ tasks }: { tasks: Task[] }) {
  const setTaskStatus = useDataStore((s) => s.setTaskStatus)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as TaskStatus
    setTaskStatus(active.id as string, newStatus)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto px-5 pb-2">
        {columns.map((col) => (
          <KanbanColumn key={col.key} status={col.key} label={col.label} dotColor={col.dotColor} tasks={tasks.filter((t) => t.status === col.key)} />
        ))}
      </div>
    </DndContext>
  )
}
