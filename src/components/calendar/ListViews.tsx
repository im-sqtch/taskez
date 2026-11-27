import { CalendarDays, Plus, Repeat, SkipForward } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TaskRow } from '@/components/tasks/TaskRow'
import { WEEKDAY_LABELS, dateKey, formatFullDate, formatShortMonth, weekGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { formatDue } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'
import type { Task } from '@/types'
import type { ProjectedTask } from '@/lib/recurrenceProjection'
import { isOccurrence, projectColor, skipOccurrence } from './calendarShared'

interface TaskListProps {
  tasks: Task[]
  taskTo: (task: Task) => string
  empty: string
  onCreate?: () => void
}

// Lista de tarefas de um dia (ou de uma busca), com estado vazio que oferece criar.
export function CalendarTaskList({ tasks, taskTo, empty, onCreate }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-text-muted">
        <CalendarDays size={26} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm">{empty}</p>
        {onCreate && <button type="button" className="min-h-11 text-sm font-semibold text-accent" onClick={onCreate}>Criar tarefa</button>}
      </div>
    )
  }
  return <div className="flex flex-col">{tasks.map((task) => isOccurrence(task) ? <OccurrenceRow key={task.id} task={task} to={taskTo({ ...task, id: task.occurrenceOf })} /> : <TaskRow key={task.id} task={task} to={taskTo(task)} />)}</div>
}

// Ocorrência futura de uma tarefa recorrente: ainda não existe, então não dá
// para concluir; tocar leva à tarefa original.
function OccurrenceRow({ task, to }: { task: Task; to: string }) {
  const project = useDataStore((s) => s.projects.find((item) => item.id === task.projectId))
  return (
    <div className="flex items-center gap-1">
    <Link to={to} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-alt" aria-label={`${task.title} (ocorrência futura)`}>
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-dashed border-text-faint text-text-faint" aria-hidden="true"><Repeat size={11} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium leading-tight text-text-muted">{task.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-text-faint">
          {project && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: projectColor(project) }} />{project.name}</span>}
          <span>{formatDue(task.dueDate, task.dueTime, task.durationMinutes)}</span>
          <span>Prevista</span>
        </span>
      </span>
    </Link>
    <button type="button" onClick={() => skipOccurrence(task as ProjectedTask)} aria-label={`Pular esta ocorrência de ${task.title}`} title="Pular esta ocorrência" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
      <SkipForward size={15} />
    </button>
    </div>
  )
}

interface DayHeadingProps {
  date: Date
  todayKey: string
  count: number
  onCreate: () => void
  size?: 'lg' | 'md'
}

// Cabeçalho de um dia: dia da semana + número em círculo (hoje em roxo), no
// padrão do Google Agenda, e o botão de criar tarefa naquele dia.
export function DayHeading({ date, todayKey, count, onCreate, size = 'lg' }: DayHeadingProps) {
  const today = dateKey(date) === todayKey
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className={cn('text-[11px] font-semibold uppercase', today ? 'text-accent' : 'text-text-muted')}>{WEEKDAY_LABELS[date.getDay()]}</span>
        <span className={cn('flex items-center justify-center rounded-full font-semibold', size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-9 w-9 text-lg', today ? 'bg-accent text-white' : 'text-text')}>{date.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{formatFullDate(date)}</p>
        <p className="text-xs text-text-muted">{count === 0 ? 'Nenhuma tarefa' : count === 1 ? '1 tarefa' : `${count} tarefas`}</p>
      </div>
      <button type="button" onClick={onCreate} aria-label={`Criar tarefa em ${formatFullDate(date)}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
        <Plus size={18} />
      </button>
    </div>
  )
}

interface DayViewProps {
  date: Date
  todayKey: string
  tasks: Task[]
  taskTo: (task: Task) => string
  onCreate: () => void
}

export function DayView({ date, todayKey, tasks, taskTo, onCreate }: DayViewProps) {
  return (
    <section aria-label={formatFullDate(date)} className="flex min-h-0 flex-col gap-3 rounded-2xl border border-border-soft bg-base-alt p-4 lg:h-full lg:overflow-y-auto">
      <DayHeading date={date} todayKey={todayKey} count={tasks.length} onCreate={onCreate} />
      <div className="border-t border-border-soft pt-2">
        <CalendarTaskList tasks={tasks} taskTo={taskTo} empty="Nenhuma tarefa neste dia." onCreate={onCreate} />
      </div>
    </section>
  )
}

interface AgendaViewProps {
  cursor: Date
  todayKey: string
  byDay: Map<string, Task[]>
  taskTo: (task: Task) => string
  onOpenDay: (date: Date) => void
}

// Agenda: lista contínua dos dias do mês que têm tarefas, com a data numa
// coluna à esquerda (como a "Programação" do Google Agenda).
export function AgendaView({ cursor, todayKey, byDay, taskTo, onOpenDay }: AgendaViewProps) {
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: lastDay }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1))
    .filter((day) => byDay.has(dateKey(day)))
  return (
    <section aria-label="Agenda do mês" className="rounded-2xl border border-border-soft bg-base-alt lg:h-full lg:overflow-y-auto">
      {days.length === 0
        ? <CalendarTaskList tasks={[]} taskTo={taskTo} empty="Nenhuma tarefa neste mês com os filtros atuais." />
        : days.map((date, index) => {
          const key = dateKey(date)
          const today = key === todayKey
          return (
            <div key={key} className={cn('flex gap-3 px-3 py-3', index > 0 && 'border-t border-border-soft')}>
              <button type="button" onClick={() => onOpenDay(date)} aria-label={`Abrir ${formatFullDate(date)}`} className="flex w-14 shrink-0 flex-col items-center gap-0.5 self-start rounded-xl py-1 hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold', today ? 'bg-accent text-white' : 'text-text')}>{date.getDate()}</span>
                <span className={cn('text-[11px] font-semibold uppercase', today ? 'text-accent' : 'text-text-muted')}>{formatShortMonth(date)}, {WEEKDAY_LABELS[date.getDay()]}</span>
              </button>
              <div className="min-w-0 flex-1"><CalendarTaskList tasks={byDay.get(key) ?? []} taskTo={taskTo} empty="" /></div>
            </div>
          )
        })}
    </section>
  )
}

interface MobileWeekProps {
  cursor: Date
  todayKey: string
  byDay: Map<string, Task[]>
  taskTo: (task: Task) => string
  onCreate: (key: string) => void
}

// Semana no celular: um bloco por dia, um embaixo do outro.
export function MobileWeek({ cursor, todayKey, byDay, taskTo, onCreate }: MobileWeekProps) {
  return (
    <section aria-label="Tarefas da semana" className="flex flex-col gap-3">
      {weekGrid(cursor).map((date) => {
        const key = dateKey(date)
        const list = byDay.get(key) ?? []
        return (
          <div key={key} data-calendar-day={key} className="rounded-2xl border border-border-soft bg-base-alt p-3">
            <DayHeading date={date} todayKey={todayKey} count={list.length} onCreate={() => onCreate(key)} size="md" />
            {list.length > 0 && <div className="mt-2 border-t border-border-soft pt-1"><CalendarTaskList tasks={list} taskTo={taskTo} empty="" /></div>}
          </div>
        )
      })}
    </section>
  )
}
