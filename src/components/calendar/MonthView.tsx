import { useEffect, useRef, useState } from 'react'
import { WEEKDAY_LABELS, dateKey, formatFullDate, formatShortMonth, isSameMonth, keyToDate, monthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'
import { AnchoredPopover } from './AnchoredPopover'
import { DropDay, EventChip } from './EventChip'

// Altura de cada etiqueta (22px) + espaço entre elas (2px).
const CHIP_SLOT = 24
// Número do dia no topo da célula + respiros.
const CELL_CHROME = 34

interface MonthViewProps {
  cursor: Date
  todayKey: string
  byDay: Map<string, Task[]>
  projectsById: Map<string, Project>
  onCreate: (key: string) => void
  onOpenDay: (date: Date) => void
  onOpenTask: (task: Task, anchor: HTMLElement) => void
}

// Grade do mês no desktop, no estilo do Google Agenda: ocupa a altura toda, cada
// célula mostra quantas etiquetas couberem e o resto vira "+N mais".
export function MonthView({ cursor, todayKey, byDay, projectsById, onCreate, onOpenDay, onOpenTask }: MonthViewProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [slots, setSlots] = useState(3)
  const [moreDay, setMoreDay] = useState<{ key: string; anchor: HTMLElement } | null>(null)
  const days = monthGrid(cursor)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const observer = new ResizeObserver(() => {
      const rowHeight = grid.clientHeight / 6
      setSlots(Math.max(1, Math.floor((rowHeight - CELL_CHROME) / CHIP_SLOT)))
    })
    observer.observe(grid)
    return () => observer.disconnect()
  }, [])

  const moreTasks = moreDay ? byDay.get(moreDay.key) ?? [] : []

  return (
    <div className="flex h-full min-h-0 select-none flex-col overflow-hidden rounded-2xl border border-border-soft bg-base-alt">
      <div className="grid grid-cols-7 border-b border-border-soft">
        {WEEKDAY_LABELS.map((label) => <div key={label} className="py-2 text-center text-[11px] font-semibold uppercase text-text-muted">{label}</div>)}
      </div>
      <div ref={gridRef} className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((date, index) => {
          const key = dateKey(date)
          const list = byDay.get(key) ?? []
          const overflow = list.length > slots
          const visible = overflow ? list.slice(0, Math.max(0, slots - 1)) : list
          const outside = !isSameMonth(date, cursor)
          return (
            <DropDay
              key={key}
              dayKey={key}
              onClick={() => onCreate(key)}
              className={cn(
                'group relative flex min-h-0 min-w-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-border-soft px-1 pb-1 pt-1 transition-colors hover:bg-surface/40',
                index % 7 !== 6 && 'border-r',
                index < 35 && 'border-b',
                outside && 'bg-base/40',
              )}
            >
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onOpenDay(date) }}
                aria-label={`Abrir ${formatFullDate(date)}`}
                className={cn(
                  'mx-auto flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent',
                  key === todayKey ? 'bg-accent font-bold text-white' : outside ? 'text-text-faint hover:bg-surface-hover' : 'text-text hover:bg-surface-hover',
                )}
              >
                {date.getDate() === 1 ? `${date.getDate()} de ${formatShortMonth(date)}` : date.getDate()}
              </button>
              {visible.map((task) => <EventChip key={task.id} task={task} project={projectsById.get(task.projectId ?? '')} onOpen={onOpenTask} />)}
              {overflow && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); setMoreDay({ key, anchor: event.currentTarget }) }}
                  className="h-[22px] shrink-0 rounded-md px-1.5 text-left text-xs font-semibold text-text-muted hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
                >
                  +{list.length - visible.length} mais
                </button>
              )}
              <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:bottom-1 focus:right-1 focus:rounded-md focus:bg-accent focus:px-2 focus:text-xs focus:text-white" onClick={(event) => { event.stopPropagation(); onCreate(key) }}>
                Criar tarefa em {formatFullDate(date)}
              </button>
            </DropDay>
          )
        })}
      </div>
      {moreDay && (
        <AnchoredPopover anchor={moreDay.anchor} onClose={() => setMoreDay(null)} width={260} label={`Tarefas de ${formatFullDate(keyToDate(moreDay.key))}`}>
          <DayPopoverHeader dayKey={moreDay.key} todayKey={todayKey} />
          <div className="mt-3 flex flex-col gap-1">
            {moreTasks.map((task) => (
              <EventChip key={task.id} task={task} project={projectsById.get(task.projectId ?? '')} draggable={false} onOpen={(item, anchor) => { setMoreDay(null); onOpenTask(item, anchor) }} />
            ))}
          </div>
        </AnchoredPopover>
      )}
    </div>
  )
}

function DayPopoverHeader({ dayKey, todayKey }: { dayKey: string; todayKey: string }) {
  const date = keyToDate(dayKey)
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-semibold uppercase text-text-muted">{WEEKDAY_LABELS[date.getDay()]}</span>
      <span className={cn('flex h-11 w-11 items-center justify-center rounded-full text-xl font-semibold', dayKey === todayKey ? 'bg-accent text-white' : 'text-text')}>{date.getDate()}</span>
    </div>
  )
}
