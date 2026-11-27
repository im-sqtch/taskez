import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { WEEKDAY_LABELS, dateKey, formatFullDate, minutesToTime, timeToMinutes } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'
import { DropDay, EventChip } from './EventChip'

// Altura de uma hora na grade (px). Também usada para converter a posição do
// clique/arraste em horário (ver CalendarPage.handleDragEnd).
export const HOUR_HEIGHT = 48
const SLOT_MINUTES = 30
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

interface TimeGridProps {
  days: Date[]
  todayKey: string
  byDay: Map<string, Task[]>
  projectsById: Map<string, Project>
  onCreate: (key: string, time?: string) => void
  onOpenDay: (date: Date) => void
  onOpenTask: (task: Task, anchor: HTMLElement) => void
}

// Grade de horas do Google Agenda (Dia e Semana no desktop): faixa "dia
// inteiro" no topo para tarefas sem horário e, abaixo, as 24 horas com as
// tarefas com horário posicionadas na hora certa.
export function TimeGrid({ days, todayKey, byDay, projectsById, onCreate, onOpenDay, onOpenTask }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMinutes, setNowMinutes] = useState(() => minutesOfDay(new Date()))
  const single = days.length === 1

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(minutesOfDay(new Date())), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // Abre rolado perto do início do expediente, ou antes, se houver tarefa mais cedo.
  const firstKey = dateKey(days[0]!)
  useEffect(() => {
    const timed = days.flatMap((day) => (byDay.get(dateKey(day)) ?? []).filter((task) => task.dueTime))
    const earliest = Math.min(7 * 60, ...timed.map((task) => timeToMinutes(task.dueTime!)))
    scrollRef.current?.scrollTo({ top: Math.max(0, (earliest / 60) * HOUR_HEIGHT - 12) })
    // Só ao trocar de período — não a cada tarefa editada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey, days.length])

  function createAt(event: MouseEvent<HTMLDivElement>, key: string) {
    const rect = event.currentTarget.getBoundingClientRect()
    const minutes = Math.floor(((event.clientY - rect.top) / HOUR_HEIGHT) * (60 / SLOT_MINUTES)) * SLOT_MINUTES
    onCreate(key, minutesToTime(minutes))
  }

  return (
    <div className="flex h-full min-h-0 select-none flex-col overflow-hidden rounded-2xl border border-border-soft bg-base-alt">
      {/* Cabeçalho dos dias */}
      <div className="flex border-b border-border-soft">
        <div className="w-14 shrink-0" />
        {days.map((date) => {
          const key = dateKey(date)
          const today = key === todayKey
          return (
            <div key={key} className={cn('flex min-w-0 flex-1 flex-col gap-1 border-l border-border-soft py-2.5', single ? 'items-start px-4' : 'items-center')}>
              <span className={cn('text-[11px] font-semibold uppercase', today ? 'text-accent' : 'text-text-muted')}>{WEEKDAY_LABELS[date.getDay()]}</span>
              <button
                type="button"
                onClick={() => onOpenDay(date)}
                aria-label={`Abrir ${formatFullDate(date)}`}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full text-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent', today ? 'bg-accent text-white' : 'text-text hover:bg-surface-hover')}
              >
                {date.getDate()}
              </button>
            </div>
          )
        })}
      </div>

      {/* Dia inteiro (sem horário) */}
      <div className="flex border-b border-border-soft">
        <div className="flex w-14 shrink-0 items-start justify-end pr-2 pt-2 text-[10px] font-medium text-text-faint">Dia todo</div>
        {days.map((date) => {
          const key = dateKey(date)
          const allDay = (byDay.get(key) ?? []).filter((task) => !task.dueTime)
          return (
            <DropDay
              key={key}
              dayKey={key}
              zone="allday"
              onClick={() => onCreate(key)}
              className="flex max-h-32 min-h-9 min-w-0 flex-1 cursor-pointer flex-col gap-0.5 overflow-y-auto border-l border-border-soft p-1 transition-colors hover:bg-surface/40"
            >
              {allDay.map((task) => <EventChip key={task.id} task={task} project={projectsById.get(task.projectId ?? '')} onOpen={onOpenTask} />)}
            </DropDay>
          )
        })}
      </div>

      {/* Horas */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="relative w-14 shrink-0" aria-hidden="true">
            {HOURS.slice(1).map((hour) => (
              <span key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-text-faint" style={{ top: hour * HOUR_HEIGHT }}>
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {days.map((date) => {
            const key = dateKey(date)
            const placed = layoutTimed((byDay.get(key) ?? []).filter((task) => task.dueTime))
            return (
              <DropDay
                key={key}
                dayKey={key}
                zone="timed"
                onClick={(event) => createAt(event, key)}
                aria-label={`Horários de ${formatFullDate(date)}`}
                className="relative min-w-0 flex-1 cursor-pointer border-l border-border-soft"
              >
                {HOURS.map((hour) => (
                  <div key={hour} className="pointer-events-none absolute inset-x-0 border-t border-border-soft/70" style={{ top: hour * HOUR_HEIGHT }} aria-hidden="true" />
                ))}
                {placed.map(({ task, start, end, column, columns }) => (
                  <div
                    key={task.id}
                    className="absolute z-10 px-0.5"
                    style={{
                      top: (start / 60) * HOUR_HEIGHT + 1,
                      height: (Math.max(MIN_BLOCK_MINUTES, end - start) / 60) * HOUR_HEIGHT - 2,
                      left: `${(column / columns) * 100}%`,
                      width: `${100 / columns}%`,
                    }}
                  >
                    <EventChip task={task} project={projectsById.get(task.projectId ?? '')} onOpen={onOpenTask} layout="timed" />
                  </div>
                ))}
                {key === todayKey && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }} aria-hidden="true">
                    <span className="-ml-1.5 h-3 w-3 rounded-full bg-danger" />
                    <span className="h-0.5 flex-1 bg-danger" />
                  </div>
                )}
              </DropDay>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Bloco mínimo na tela (tarefas curtas continuam clicáveis).
const MIN_BLOCK_MINUTES = 20
const DEFAULT_DURATION = 30

interface PlacedTask { task: Task; start: number; end: number; column: number; columns: number }

// Distribui tarefas que se sobrepõem lado a lado, como o Google Agenda: cada
// grupo de tarefas encavaladas divide a largura em colunas.
function layoutTimed(tasks: Task[]): PlacedTask[] {
  const items = tasks
    .map((task) => {
      const start = timeToMinutes(task.dueTime!)
      return { task, start, end: Math.min(24 * 60, start + (task.durationMinutes ?? DEFAULT_DURATION)) }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const placed: PlacedTask[] = []
  let cluster: PlacedTask[] = []
  let columnEnds: number[] = []
  let clusterEnd = -1
  const closeCluster = () => {
    for (const item of cluster) item.columns = columnEnds.length
    cluster = []
    columnEnds = []
  }
  for (const item of items) {
    if (item.start >= clusterEnd) closeCluster()
    const visualEnd = Math.max(item.end, item.start + MIN_BLOCK_MINUTES)
    let column = columnEnds.findIndex((end) => end <= item.start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(visualEnd)
    } else columnEnds[column] = visualEnd
    const entry = { ...item, column, columns: 1 }
    cluster.push(entry)
    placed.push(entry)
    clusterEnd = Math.max(clusterEnd, visualEnd)
  }
  closeCluster()
  return placed
}

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}
