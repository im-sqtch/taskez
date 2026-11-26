import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { WEEKDAY_LABELS, dateKey, formatFullDate, formatMonthTitle, isSameMonth, monthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'

interface MiniMonthProps {
  month: Date
  selectedKey: string
  todayKey: string
  onSelect: (date: Date) => void
  onMonthChange: (delta: number) => void
  // Celular: mostra pontinhos com as cores dos projetos das tarefas de cada dia.
  byDay?: Map<string, Task[]>
  projectsById?: Map<string, Project>
  variant?: 'sidebar' | 'mobile'
}

const MAX_DOTS = 3

// Minicalendário: na coluna lateral do desktop (navegação) e como grade
// principal do mês no celular (com pontinhos e a lista do dia embaixo).
export function MiniMonth({ month, selectedKey, todayKey, onSelect, onMonthChange, byDay, projectsById, variant = 'sidebar' }: MiniMonthProps) {
  const mobile = variant === 'mobile'
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  return (
    <div
      className={cn(mobile && 'rounded-2xl border border-border-soft bg-base-alt px-2 pb-2 pt-1')}
      onTouchStart={mobile ? (event) => { const t = event.touches[0]!; touchStart.current = { x: t.clientX, y: t.clientY } } : undefined}
      onTouchEnd={mobile ? (event) => {
        const start = touchStart.current
        touchStart.current = null
        const t = event.changedTouches[0]
        if (!start || !t) return
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        // Arrastar para os lados troca de mês (só gestos claramente horizontais).
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onMonthChange(dx < 0 ? 1 : -1)
      } : undefined}
    >
      {!mobile && (
        <div className="mb-1 flex items-center gap-1">
          <p className="flex-1 truncate pl-1 text-sm font-semibold text-text">{formatMonthTitle(month)}</p>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent" aria-label="Mês anterior no minicalendário" onClick={() => onMonthChange(-1)}><ChevronLeft size={16} /></button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent" aria-label="Próximo mês no minicalendário" onClick={() => onMonthChange(1)}><ChevronRight size={16} /></button>
        </div>
      )}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label) => <span key={label} className={cn('font-semibold uppercase text-text-muted', mobile ? 'py-2 text-[11px]' : 'py-1 text-[10px]')}>{mobile ? label : label[0]}</span>)}
        {monthGrid(month).map((date) => {
          const key = dateKey(date)
          const selected = key === selectedKey
          const today = key === todayKey
          const outside = !isSameMonth(date, month)
          const tasks = byDay?.get(key) ?? []
          const colors = [...new Set(tasks.map((task) => projectsById?.get(task.projectId ?? '')?.color ?? 'var(--color-accent)'))]
          return (
            <button
              key={key}
              type="button"
              data-calendar-day={mobile ? key : undefined}
              aria-label={`${formatFullDate(date)}${tasks.length ? `, ${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}` : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(date)}
              className={cn('flex flex-col items-center justify-start rounded-xl focus-visible:outline-2 focus-visible:outline-accent', mobile ? 'h-12 gap-1 pt-1' : 'h-8 justify-center')}
            >
              <span className={cn(
                'flex items-center justify-center rounded-full',
                mobile ? 'h-8 w-8 text-sm' : 'h-7 w-7 text-xs',
                today ? 'bg-accent font-bold text-white' : selected ? 'bg-accent-soft font-bold text-accent' : outside ? 'text-text-faint hover:bg-surface-alt' : 'text-text hover:bg-surface-alt',
              )}>{date.getDate()}</span>
              {mobile && (
                <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                  {colors.slice(0, MAX_DOTS).map((color) => <span key={color} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
