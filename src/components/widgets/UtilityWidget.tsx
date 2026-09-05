import { Flame, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { computeStats } from '@/lib/stats'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const POMODORO_SECONDS = 25 * 60

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function WeekStrip() {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  return (
    <div className="flex justify-between gap-1">
      {days.map((day, i) => {
        const isToday = sameDay(day, today)
        return (
          <div
            key={i}
            className={cn('flex flex-1 flex-col items-center gap-1 rounded-lg py-2', isToday && 'bg-accent-soft')}
          >
            <span className={cn('text-[11px] font-medium text-text-faint', isToday && 'text-accent')}>
              {WEEKDAY_LETTERS[day.getDay()]}
            </span>
            <span className={cn('text-sm font-bold text-text', isToday && 'text-accent')}>{day.getDate()}</span>
          </div>
        )
      })}
    </div>
  )
}

function StreakRow({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface-alt px-3.5 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
        <Flame size={15} />
      </div>
      <p className="flex-1 text-sm font-medium text-text">Sequência de dias</p>
      <p className="text-sm font-bold text-text">{streak}d</p>
    </div>
  )
}

// Timer simples de sessão de foco: roda apenas enquanto o widget está montado
// (sem persistência entre navegações ou fechamento do app).
function PomodoroTimer() {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_SECONDS)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setRunning(false)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')

  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-alt px-4 py-3">
      <div>
        <p className="text-xs font-semibold text-text-muted">Pomodoro</p>
        <p className="text-2xl font-bold tabular-nums text-text">
          {minutes}:{seconds}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setSecondsLeft(POMODORO_SECONDS)
            setRunning(false)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted"
          aria-label="Reiniciar"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          disabled={secondsLeft === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
          aria-label={running ? 'Pausar' : 'Iniciar'}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    </div>
  )
}

export function UtilityWidget({ size }: { size: WidgetSize }) {
  const tasks = useWorkspaceTasks()
  const stats = computeStats(tasks)

  return (
    <Card className="flex flex-col gap-3.5">
      {size === 'L' && <WeekStrip />}
      {size !== 'S' && <StreakRow streak={stats.streak} />}
      <PomodoroTimer />
    </Card>
  )
}
