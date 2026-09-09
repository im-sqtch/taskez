import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FieldLabel } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { WEEKDAY_LABELS, addMonths, dateKey, formatMonthTitle, keyToDate, monthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { RecurrenceFrequency, RecurrenceRule } from '@/types'

interface RecurrenceFieldProps {
  value: RecurrenceRule | undefined
  onChange: (rule: RecurrenceRule | undefined) => void
}

const frequencies: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
]

function summarize(rule: RecurrenceRule | undefined): string {
  if (!rule) return 'Não repete'
  if (rule.frequency === 'daily') return 'Todo dia'
  if (rule.frequency === 'weekly') {
    const days = rule.weekdays ?? []
    if (days.length === 0) return 'Semanalmente'
    return `Toda ${days.map((d) => WEEKDAY_LABELS[d]).join(', ')}`
  }
  return `Todo dia ${rule.dayOfMonth ?? 1} do mês`
}

// Botão + sub-sheet "Repetir", no mesmo padrão visual do seletor de prazo já
// usado em TaskFormSheet/ProjectFormSheet. Compartilhado pelos dois forms
// (diferente do prazo, que está duplicado neles) porque a regra tem 3
// sub-modos — vale a pena não triplicar essa lógica depois.
export function RecurrenceField({ value, onChange }: RecurrenceFieldProps) {
  const [open, setOpen] = useState(false)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [endDate, setEndDate] = useState('')
  const [endCalendarCursor, setEndCalendarCursor] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    setFrequency(value?.frequency ?? 'weekly')
    setWeekdays(value?.weekdays ?? [new Date().getDay()])
    setDayOfMonth(value?.dayOfMonth ?? new Date().getDate())
    setEndDate(value?.endDate ? value.endDate.slice(0, 10) : '')
    setEndCalendarCursor(value?.endDate ? keyToDate(value.endDate.slice(0, 10)) : new Date())
  }, [open, value])

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  function apply() {
    onChange({
      frequency,
      weekdays: frequency === 'weekly' ? weekdays : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    })
    setOpen(false)
  }

  function clear() {
    onChange(undefined)
    setOpen(false)
  }

  const canApply = frequency !== 'weekly' || weekdays.length > 0

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Repetir</FieldLabel>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-13 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-left text-sm text-text outline-none transition-colors focus:border-accent"
        >
          <Repeat size={16} className="shrink-0 text-text-faint" />
          <span className={cn('flex-1 truncate', !value && 'text-text-faint')}>{summarize(value)}</span>
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Repetir"
        headerAction={
          value ? (
            <button onClick={clear} className="rounded-full px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-danger">
              Não repetir
            </button>
          ) : undefined
        }
        footer={
          <Button fullWidth size="lg" onClick={apply} disabled={!canApply}>
            Aplicar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {frequencies.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={cn(
                  'flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors',
                  frequency === f.value ? 'border-transparent bg-accent text-white' : 'border-border text-text-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {frequency === 'weekly' && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Dias da semana</FieldLabel>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    onClick={() => toggleWeekday(day)}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-full text-xs font-semibold uppercase transition-colors',
                      weekdays.includes(day) ? 'bg-accent text-white' : 'bg-surface text-text-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === 'monthly' && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Dia do mês</FieldLabel>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => setDayOfMonth(day)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors',
                      dayOfMonth === day ? 'bg-accent text-white' : 'bg-surface text-text-muted',
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel>Até (opcional)</FieldLabel>
              {endDate && (
                <button onClick={() => setEndDate('')} className="text-xs font-semibold text-text-muted hover:text-danger">
                  Remover
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text">{formatMonthTitle(endCalendarCursor)}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEndCalendarCursor((c) => addMonths(c, -1))}
                  aria-label="Mês anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setEndCalendarCursor((c) => addMonths(c, 1))}
                  aria-label="Próximo mês"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
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
              {monthGrid(endCalendarCursor).map((date) => {
                const key = dateKey(date)
                const selected = key === endDate
                const muted = date.getMonth() !== endCalendarCursor.getMonth()
                return (
                  <button key={key} onClick={() => setEndDate(key)} className="flex items-center justify-center py-1">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                        selected && 'bg-accent font-bold text-white',
                        !selected && muted && 'text-text-faint',
                        !selected && !muted && 'font-medium text-text',
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  )
}
