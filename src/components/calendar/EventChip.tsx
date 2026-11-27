import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Repeat } from 'lucide-react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { formatTimeRange } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'
import { isOccurrence, justDragged, projectColor } from './calendarShared'

interface ChipBodyProps extends HTMLAttributes<HTMLElement> {
  task: Task
  project: Project | undefined
  // 'grid': etiqueta de uma linha (mês, dia inteiro); 'timed': bloco na grade de horas.
  layout?: 'grid' | 'timed'
}

// Visual da etiqueta, no padrão do Google Agenda:
// - sem horário ("dia inteiro"): fundo na cor do projeto;
// - com horário: ponto colorido + horário + título, sem fundo (no mês) ou
//   bloco com borda colorida (na grade de horas);
// - ocorrência futura de recorrente: contorno tracejado, ainda não existe.
export function ChipBody({ task, project, layout = 'grid', className, style, ...rest }: ChipBodyProps) {
  const color = projectColor(project)
  const done = task.status === 'done'
  const projected = isOccurrence(task)
  const recurring = projected || Boolean(task.recurrence ?? project?.recurrence)
  const filled = layout === 'timed' || !task.dueTime
  const tall = layout === 'timed' && Boolean(task.dueTime) && (task.durationMinutes ?? 30) >= 45
  const chipStyle: CSSProperties = projected
    ? { borderColor: color }
    : filled ? { backgroundColor: `color-mix(in srgb, ${color} 24%, var(--color-surface))`, ...(layout === 'timed' ? { borderLeftColor: color } : {}) } : {}
  return (
    <span
      {...rest}
      className={cn(
        'flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs font-medium text-text',
        layout === 'timed' ? 'h-full items-start border-l-[3px] py-0.5' : 'h-[22px]',
        projected && 'border border-dashed bg-transparent text-text-muted',
        done && 'opacity-55',
        className,
      )}
      style={{ ...chipStyle, ...style }}
    >
      {layout === 'grid' && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />}
      {tall ? (
        // Bloco alto na grade de horas: título em cima e o intervalo embaixo.
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('truncate font-semibold', done && 'line-through')}>{task.title}</span>
          <span className="truncate tabular-nums text-text-muted">{formatTimeRange(task.dueTime!, task.durationMinutes)}</span>
        </span>
      ) : (
        layout === 'timed' ? (
          // Bloco curto na grade: título primeiro (a posição já indica a hora).
          <span className="flex min-w-0 flex-1 gap-1.5 truncate">
            <span className={cn('truncate font-semibold', done && 'line-through')}>{task.title}</span>
            <span className="shrink-0 tabular-nums text-text-muted">{task.dueTime}</span>
          </span>
        ) : (
          <>
            {task.dueTime && <span className="shrink-0 tabular-nums text-text-muted">{task.dueTime}</span>}
            <span className={cn('min-w-0 flex-1 truncate', done && 'line-through')}>{task.title}</span>
          </>
        )
      )}
      {recurring && <Repeat size={10} className="mt-0.5 shrink-0 text-text-faint" aria-hidden="true" />}
    </span>
  )
}

interface EventChipProps {
  task: Task
  project: Project | undefined
  onOpen: (task: Task, anchor: HTMLElement) => void
  draggable?: boolean
  layout?: 'grid' | 'timed'
}

// Etiqueta de tarefa nas grades: clique abre o cartão rápido; arrastar
// (desktop) muda o prazo. Ocorrências projetadas não podem ser arrastadas.
export function EventChip({ task, project, onOpen, draggable = true, layout = 'grid' }: EventChipProps) {
  const projected = isOccurrence(task)
  const canDrag = draggable && !projected
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task:${task.id}`, data: { task }, disabled: !canDrag })
  const label = `${task.dueTime ? `${task.dueTime}, ` : ''}${task.title}${task.status === 'done' ? ' (concluída)' : ''}${projected ? ' (ocorrência futura)' : ''}`
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      aria-label={label}
      title={label}
      data-task-chip={task.id}
      onClick={(event) => {
        event.stopPropagation()
        if (!justDragged()) onOpen(task, event.currentTarget)
      }}
      className={cn('block w-full min-w-0 rounded-md transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-accent', layout === 'timed' && 'h-full', isDragging && 'opacity-30')}
    >
      <ChipBody task={task} project={project} layout={layout} />
    </button>
  )
}

interface DropDayProps extends HTMLAttributes<HTMLDivElement> {
  dayKey: string
  // 'day': célula do mês (mantém o horário); 'allday': faixa "dia inteiro"
  // (remove o horário); 'timed': coluna da grade de horas (define o horário).
  zone?: 'day' | 'allday' | 'timed'
  children: ReactNode
}

export function DropDay({ dayKey, zone = 'day', className, children, ...rest }: DropDayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${zone}:${dayKey}`, data: { dayKey, zone } })
  return (
    <div ref={setNodeRef} data-calendar-day={zone === 'timed' ? undefined : dayKey} data-calendar-zone={zone} className={cn(className, isOver && 'bg-accent-soft outline-2 -outline-offset-2 outline-accent')} {...rest}>
      {children}
    </div>
  )
}
