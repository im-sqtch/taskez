import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { WEEKDAY_LABELS, addMonths, dateKey, formatMonthTitle, keyToDate, monthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'

interface DatePickerSheetProps {
  open: boolean
  onClose: () => void
  title: string
  // "AAAA-MM-DD" ou vazio.
  value: string
  onChange: (key: string) => void
}

const DAY_LABEL = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

// Sheet com o calendário do mês para escolher um dia (mesmo visual do prazo da tarefa).
export function DatePickerSheet({ open, onClose, title, value, onChange }: DatePickerSheetProps) {
  const [cursor, setCursor] = useState(() => (value ? keyToDate(value) : new Date()))
  const todayKey = dateKey(new Date())

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      headerAction={value ? (
        <button onClick={() => { onChange(''); onClose() }} className="rounded-full px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-danger">
          Remover
        </button>
      ) : undefined}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text">{formatMonthTitle(cursor)}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Mês anterior" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Próximo mês" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-text-faint">{label}</span>
          ))}
          {monthGrid(cursor).map((date) => {
            const key = dateKey(date)
            const selected = key === value
            const muted = date.getMonth() !== cursor.getMonth()
            return (
              <button key={key} aria-label={DAY_LABEL.format(date)}onClick={() => { onChange(key); onClose() }} className="flex items-center justify-center py-1">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                    selected && 'bg-accent font-bold text-white',
                    !selected && key === todayKey && 'bg-accent-soft font-bold text-accent',
                    !selected && key !== todayKey && muted && 'text-text-faint',
                    !selected && key !== todayKey && !muted && 'font-medium text-text',
                  )}
                >
                  {date.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
