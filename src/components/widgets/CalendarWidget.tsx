import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { TaskRow } from '@/components/tasks/TaskRow'
import {
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  dateKey,
  dueDateKey,
  formatFullDate,
  formatMonthTitle,
  formatWeekTitle,
  keyToDate,
  monthGrid,
  weekGrid,
} from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { useDataStore, useWorkspaceTasks } from '@/store/dataStore'
import type { Task, WidgetSize } from '@/types'

// Além disso a célula fica apertada demais em meses cheios.
const MAX_DOTS = 3

// Pendentes primeiro: quem já concluiu a tarefa não precisa dela no topo da lista.
function byPendingFirst(a: Task, b: Task): number {
  const aDone = a.status === 'done' ? 1 : 0
  const bDone = b.status === 'done' ? 1 : 0
  return aDone - bDone
}

function TaskDots({ tasks, colorOf }: { tasks: Task[]; colorOf: (task: Task) => string | undefined }) {
  // Só o que ainda está pendente vira bolinha — tarefa concluída continua na
  // lista do dia (riscada), mas não disputa espaço na grade.
  const pending = tasks.filter((t) => t.status !== 'done').slice(0, MAX_DOTS)
  return (
    <div className="flex h-1.5 items-center justify-center gap-[3px]">
      {pending.map((task) => {
        const color = colorOf(task)
        return (
          <span
            key={task.id}
            className={cn('h-1.5 w-1.5 rounded-full', !color && 'bg-text-faint')}
            style={color ? { backgroundColor: color } : undefined}
          />
        )
      })}
    </div>
  )
}

interface DayCellProps {
  date: Date
  tasks: Task[]
  selected: boolean
  isToday: boolean
  muted?: boolean
  colorOf: (task: Task) => string | undefined
  onSelect: (date: Date) => void
}

function DayCell({ date, tasks, selected, isToday, muted, colorOf, onSelect }: DayCellProps) {
  return (
    <button
      onClick={() => onSelect(date)}
      aria-label={formatFullDate(date)}
      aria-pressed={selected}
      className="flex flex-col items-center gap-1 rounded-lg py-1"
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
          selected && 'bg-accent font-bold text-white',
          !selected && isToday && 'bg-accent-soft font-bold text-accent',
          !selected && !isToday && muted && 'text-text-faint',
          !selected && !isToday && !muted && 'font-medium text-text',
        )}
      >
        {date.getDate()}
      </span>
      <TaskDots tasks={tasks} colorOf={colorOf} />
    </button>
  )
}

export function CalendarWidget({ size }: { size: WidgetSize }) {
  const tasks = useWorkspaceTasks()
  const projects = useDataStore((s) => s.projects)
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const todayKey = dateKey(new Date())

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = dueDateKey(task.dueDate)
      const list = map.get(key)
      if (list) list.push(task)
      else map.set(key, [task])
    }
    for (const list of map.values()) list.sort(byPendingFirst)
    return map
  }, [tasks])

  const projectColors = useMemo(() => new Map(projects.map((p) => [p.id, p.color])), [projects])
  // Tarefa sem projeto não tem cor própria; a bolinha cai no cinza neutro.
  const colorOf = (task: Task) => (task.projectId ? projectColors.get(task.projectId) : undefined)

  const selectedTasks = selectedKey ? (tasksByDay.get(selectedKey) ?? []) : []

  function toggleDay(date: Date) {
    const key = dateKey(date)
    setSelectedKey((current) => (current === key ? null : key))
    // Clicar num dia que "transborda" do mês exibido leva a grade junto.
    if (size === 'L' && date.getMonth() !== cursor.getMonth()) setCursor(new Date(date))
  }

  // Trocar de período limpa a seleção: o dia destacado deixaria de estar à vista.
  function moveCursor(next: Date) {
    setCursor(next)
    setSelectedKey(null)
  }

  const expanded = selectedKey && selectedTasks.length > 0 && (
    <div className="flex flex-col gap-1 border-t border-border-soft pt-3">
      <p className="px-1 text-xs font-semibold text-text-faint">{formatFullDate(keyToDate(selectedKey))}</p>
      {selectedTasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  )

  if (size === 'S') {
    const today = new Date()
    const todayTasks = tasksByDay.get(todayKey) ?? []
    const pendingCount = todayTasks.filter((t) => t.status !== 'done').length
    const open = selectedKey === todayKey

    return (
      <Card className="flex flex-col gap-3">
        <button onClick={() => toggleDay(today)} className="flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                open ? 'bg-accent text-white' : 'bg-accent-soft text-accent',
              )}
            >
              <CalendarDays size={16} />
            </div>
            <div>
              <p className="font-semibold text-text">Hoje</p>
              <p className="text-xs text-text-faint">{formatFullDate(today)}</p>
            </div>
          </div>
          <p className="text-lg font-bold text-text">{pendingCount}</p>
        </button>
        {expanded}
      </Card>
    )
  }

  const days = size === 'L' ? monthGrid(cursor) : weekGrid(cursor)
  const title = size === 'L' ? formatMonthTitle(cursor) : formatWeekTitle(days)
  const step = size === 'L' ? (delta: number) => addMonths(cursor, delta) : (delta: number) => addDays(cursor, delta * 7)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text">{title}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => moveCursor(step(-1))}
            aria-label={size === 'L' ? 'Mês anterior' : 'Semana anterior'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-text-muted transition-colors hover:text-text"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => moveCursor(step(1))}
            aria-label={size === 'L' ? 'Próximo mês' : 'Próxima semana'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-text-muted transition-colors hover:text-text"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-text-faint">
            {label}
          </span>
        ))}
        {days.map((date) => {
          const key = dateKey(date)
          return (
            <DayCell
              key={key}
              date={date}
              tasks={tasksByDay.get(key) ?? []}
              selected={selectedKey === key}
              isToday={key === todayKey}
              muted={size === 'L' && date.getMonth() !== cursor.getMonth()}
              colorOf={colorOf}
              onSelect={toggleDay}
            />
          )
        })}
      </div>

      {expanded}
    </Card>
  )
}
