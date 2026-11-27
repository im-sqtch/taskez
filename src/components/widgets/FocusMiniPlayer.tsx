import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { focusSnapshot, formatClock } from '@/lib/focusPip'
import { cn } from '@/lib/utils'
import { usePomodoroStore } from '@/store/pomodoroStore'

const roundButton = 'flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent'

// Mini painel do foco dentro da janela flutuante do Chrome/Edge de computador
// (Document Picture-in-Picture). No celular a janela é um vídeo (ver focusPip).
export function FocusMiniPlayer() {
  // Reage a qualquer mudança da store (o snapshot é calculado a partir dela).
  usePomodoroStore((s) => s.timers)
  usePomodoroStore((s) => s.trackId)
  usePomodoroStore((s) => s.musicEnabled)
  const toggle = usePomodoroStore((s) => s.toggle)
  const reset = usePomodoroStore((s) => s.reset)
  const nextTrack = usePomodoroStore((s) => s.nextTrack)
  const snap = focusSnapshot()
  const progress = snap.totalSeconds ? 1 - snap.secondsLeft / snap.totalSeconds : 0

  return (
    <div className="flex h-screen flex-col justify-between gap-3 bg-base-alt p-4 text-text">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-accent">TaskEz · Foco</span>
        <span className="text-text-muted">{!snap.timerId ? 'Sem timer' : snap.running ? 'Em andamento' : snap.secondsLeft === 0 ? 'Concluído' : 'Pausado'}</span>
      </div>
      <div className="min-w-0">
        <p className="text-5xl font-extrabold tabular-nums" role="timer">{formatClock(snap.secondsLeft)}</p>
        <p className="mt-1 truncate text-sm font-semibold text-text-muted">{snap.name}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-alt"><div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} /></div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={!snap.timerId} onClick={() => snap.timerId && reset(snap.timerId)} aria-label="Reiniciar timer" className={roundButton}><RotateCcw size={16} /></button>
        <button type="button" disabled={!snap.timerId} onClick={() => snap.timerId && toggle(snap.timerId)} aria-label={snap.running ? 'Pausar timer' : 'Iniciar timer'} className={cn(roundButton, 'bg-accent text-white hover:text-white')}>
          {snap.running ? <Pause size={18} /> : <Play size={18} />}
        </button>
        {snap.trackTitle && <button type="button" onClick={() => nextTrack(1)} aria-label="Próxima música" className={roundButton}><SkipForward size={16} /></button>}
        {snap.trackTitle && <span className="min-w-0 truncate text-xs text-text-muted">♪ {snap.trackTitle}</span>}
      </div>
    </div>
  )
}
