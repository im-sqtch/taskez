import { create } from 'zustand'

interface TimerState {
  secondsLeft: number
  running: boolean
  // Timestamp (ms) em que o timer chega a zero. Usado para calcular o tempo
  // restante a partir do relógio real, e não de contagem de ticks — assim o
  // valor fica correto mesmo que a aba fique em segundo plano ou o widget
  // seja desmontado e remontado (troca de página no dashboard).
  endAt: number | null
}

interface PomodoroState {
  timers: Record<string, TimerState>
  start: (id: string, totalSeconds: number) => void
  toggle: (id: string, totalSeconds: number) => void
  pause: (id: string) => void
  reset: (id: string, totalSeconds: number) => void
}

function getTimer(state: PomodoroState, id: string, totalSeconds: number): TimerState {
  return state.timers[id] ?? { secondsLeft: totalSeconds, running: false, endAt: null }
}

function playCompletionSound() {
  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const ctx = new AudioContextCtor()
    const now = ctx.currentTime
    ;[0, 0.18, 0.36].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = i === 2 ? 1046.5 : 880
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    })
    setTimeout(() => ctx.close(), 700)
  } catch {
    // ambiente sem suporte a áudio (ex.: SSR) — falha silenciosamente
  }
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  timers: {},
  start: (id, totalSeconds) => {
    const current = getTimer(get(), id, totalSeconds)
    const secondsLeft = current.secondsLeft > 0 ? current.secondsLeft : totalSeconds
    set((state) => ({
      timers: {
        ...state.timers,
        [id]: { secondsLeft, running: true, endAt: Date.now() + secondsLeft * 1000 },
      },
    }))
  },
  pause: (id) => {
    set((state) => {
      const current = state.timers[id]
      if (!current?.running) return state
      const secondsLeft = current.endAt
        ? Math.max(0, Math.round((current.endAt - Date.now()) / 1000))
        : current.secondsLeft
      return { timers: { ...state.timers, [id]: { secondsLeft, running: false, endAt: null } } }
    })
  },
  toggle: (id, totalSeconds) => {
    const current = getTimer(get(), id, totalSeconds)
    if (current.running) {
      get().pause(id)
    } else {
      get().start(id, totalSeconds)
    }
  },
  reset: (id, totalSeconds) => {
    set((state) => ({
      timers: { ...state.timers, [id]: { secondsLeft: totalSeconds, running: false, endAt: null } },
    }))
  },
}))

// Loop único no nível do módulo (não em um efeito de componente), garantindo
// que a contagem continue rodando mesmo enquanto o widget do Pomodoro está
// desmontado — por exemplo, ao navegar para outra aba do dashboard.
setInterval(() => {
  const state = usePomodoroStore.getState()
  let changed = false
  const nextTimers = { ...state.timers }
  for (const [id, timer] of Object.entries(state.timers)) {
    if (!timer.running || timer.endAt === null) continue
    const secondsLeft = Math.max(0, Math.round((timer.endAt - Date.now()) / 1000))
    if (secondsLeft <= 0) {
      nextTimers[id] = { secondsLeft: 0, running: false, endAt: null }
      changed = true
      playCompletionSound()
    } else if (secondsLeft !== timer.secondsLeft) {
      nextTimers[id] = { ...timer, secondsLeft }
      changed = true
    }
  }
  if (changed) usePomodoroStore.setState({ timers: nextTimers })
}, 250)
