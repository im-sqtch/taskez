import { Flame, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { computeStats } from '@/lib/stats'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

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

// Timer simples de sessão (pomodoro ou descanso): roda apenas enquanto o widget
// está montado (sem persistência entre navegações ou fechamento do app).
function FocusTimer({ label, totalSeconds }: { label: string; totalSeconds: number }) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
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
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-text">
          {minutes}:{seconds}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setSecondsLeft(totalSeconds)
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

  if (size === 'S') {
    return (
      <Card className="flex flex-col gap-3.5">
        <StreakRow streak={stats.streak} />
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3.5">
      {size === 'L' && <StreakRow streak={stats.streak} />}
      <FocusTimer label="Pomodoro" totalSeconds={25 * 60} />
      <FocusTimer label="Descanso" totalSeconds={5 * 60} />
    </Card>
  )
}
