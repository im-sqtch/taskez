import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fireAndForget, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface TimerState {
  secondsLeft: number
  running: boolean
  // Timestamp (ms) em que o timer chega a zero. Usado para calcular o tempo
  // restante a partir do relógio real, e não de contagem de ticks — assim o
  // valor fica correto mesmo que a aba fique em segundo plano ou o widget
  // seja desmontado e remontado (troca de página no dashboard).
  endAt: number | null
  // Id da linha em `scheduled_notifications` que vai disparar o push de
  // conclusão — guardado para poder cancelar ao pausar/reiniciar/terminar.
  scheduledId?: string
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

// "pomodoro"/"break" são os únicos ids usados hoje (ver UtilityWidget.tsx) —
// os rótulos ficam fixos aqui do mesmo jeito que os 25/5 minutos já ficam
// fixos lá, sem criar uma fonte de verdade nova só para isso.
function labelsFor(id: string): { label: string; title: string; body: string } {
  if (id === 'break') return { label: 'Descanso', title: 'Pausa concluída!', body: 'Hora de voltar ao foco.' }
  return { label: 'Pomodoro', title: 'Pomodoro concluído!', body: 'Hora de fazer uma pausa.' }
}

// Agenda o push de conclusão (entregue mesmo com o app fechado — ver
// `dispatch_scheduled_notifications`/pg_cron na migration de recorrência de
// notificações). Sem usuário logado, não tem para quem agendar.
async function schedulePush(id: string, endAt: number): Promise<string | undefined> {
  const userId = useAuthStore.getState().currentUserId
  if (!userId) return undefined
  const { title, body } = labelsFor(id)
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .insert({ user_id: userId, fire_at: new Date(endAt).toISOString(), title, body, entity_type: `pomodoro:${id}` })
    .select('id')
    .single()
  if (error || !data) return undefined
  return (data as { id: string }).id
}

function cancelScheduledPush(scheduledId: string | undefined) {
  if (!scheduledId) return
  fireAndForget(supabase.from('scheduled_notifications').delete().eq('id', scheduledId))
}

// Notificação estática "em andamento" (sem contagem ao vivo — isso não é
// possível num PWA) com botões Pausar/Encerrar. Só aparece se a pessoa já
// concedeu permissão de notificação (não solicitamos a partir daqui).
async function showRunningNotification(id: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return
  const { label } = labelsFor(id)
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(`${label} em andamento`, {
      tag: `pomodoro-${id}`,
      silent: true,
      requireInteraction: true,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      actions: [
        { action: 'pomodoro-pause', title: 'Pausar' },
        { action: 'pomodoro-stop', title: 'Encerrar' },
      ],
      data: { pomodoroId: id },
    } as NotificationOptions)
  } catch {
    // sem Service Worker ativo/sem suporte — degrada para o comportamento local
  }
}

async function closeRunningNotification(id: string) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const list = await reg.getNotifications({ tag: `pomodoro-${id}` })
    list.forEach((n) => n.close())
  } catch {
    // ignora
  }
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      timers: {},
      start: (id, totalSeconds) => {
        const current = getTimer(get(), id, totalSeconds)
        const secondsLeft = current.secondsLeft > 0 ? current.secondsLeft : totalSeconds
        const endAt = Date.now() + secondsLeft * 1000
        set((state) => ({
          timers: { ...state.timers, [id]: { secondsLeft, running: true, endAt, scheduledId: undefined } },
        }))
        void showRunningNotification(id)
        void schedulePush(id, endAt).then((scheduledId) => {
          // Só anexa o agendamento se este ainda for o mesmo ciclo — evita
          // reanexar a um timer que já foi pausado/reiniciado nesse meio-tempo.
          const timerNow = usePomodoroStore.getState().timers[id]
          if (!scheduledId) return
          if (!timerNow?.running || timerNow.endAt !== endAt) {
            cancelScheduledPush(scheduledId)
            return
          }
          usePomodoroStore.setState((state) => ({
            timers: { ...state.timers, [id]: { ...state.timers[id]!, scheduledId } },
          }))
        })
      },
      pause: (id) => {
        const current = get().timers[id]
        if (!current?.running) return
        cancelScheduledPush(current.scheduledId)
        set((state) => {
          const secondsLeft = current.endAt
            ? Math.max(0, Math.round((current.endAt - Date.now()) / 1000))
            : current.secondsLeft
          return { timers: { ...state.timers, [id]: { secondsLeft, running: false, endAt: null, scheduledId: undefined } } }
        })
        void closeRunningNotification(id)
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
        cancelScheduledPush(get().timers[id]?.scheduledId)
        set((state) => ({
          timers: { ...state.timers, [id]: { secondsLeft: totalSeconds, running: false, endAt: null, scheduledId: undefined } },
        }))
        void closeRunningNotification(id)
      },
    }),
    {
      name: 'taskez-pomodoro',
      // Ao reabrir o app/recarregar a página, o tempo que passou enquanto ele
      // estava fechado precisa ser descontado silenciosamente (sem tocar o
      // som de conclusão) — o loop de tick abaixo assumiria erroneamente que
      // o timer acabou de terminar agora.
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return
        const now = Date.now()
        const timers = { ...state.timers }
        let changed = false
        for (const [id, timer] of Object.entries(timers)) {
          if (timer.running && timer.endAt !== null) {
            const secondsLeft = Math.max(0, Math.round((timer.endAt - now) / 1000))
            timers[id] =
              secondsLeft <= 0
                ? { secondsLeft: 0, running: false, endAt: null, scheduledId: undefined }
                : { ...timer, secondsLeft }
            changed = true
          }
        }
        if (changed) usePomodoroStore.setState({ timers })
      },
    },
  ),
)

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
      nextTimers[id] = { secondsLeft: 0, running: false, endAt: null, scheduledId: undefined }
      changed = true
      playCompletionSound()
      // Terminou em primeiro plano — cancela o push agendado pra não vir uma
      // notificação redundante minutos depois (granularidade do pg_cron).
      cancelScheduledPush(timer.scheduledId)
      void closeRunningNotification(id)
    } else if (secondsLeft !== timer.secondsLeft) {
      nextTimers[id] = { ...timer, secondsLeft }
      changed = true
    }
  }
  if (changed) usePomodoroStore.setState({ timers: nextTimers })
}, 250)

// Repasse de "Pausar"/"Encerrar" clicados na notificação do sistema, quando o
// Service Worker encontrou uma aba já aberta (ver public/sw.js).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event.data as { type?: string; action?: string; id?: string } | undefined
    if (payload?.type !== 'pomodoro-action' || !payload.id) return
    if (payload.action === 'pause') usePomodoroStore.getState().pause(payload.id)
    if (payload.action === 'stop') usePomodoroStore.getState().reset(payload.id, payload.id === 'break' ? 5 * 60 : 25 * 60)
  })
}

// Fallback para quando não havia nenhuma aba aberta: o Service Worker abriu
// uma nova janela com a ação na URL (ver public/sw.js). Só aplica depois que
// o estado persistido termina de reidratar, senão agiria sobre timers ainda
// no valor padrão (vazio) e a ação seria um no-op silencioso.
function applyPendingPomodoroUrlAction() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const action = params.get('pomodoroAction')
  const id = params.get('pomodoroId')
  if (!action || !id) return
  if (action === 'pause') usePomodoroStore.getState().pause(id)
  if (action === 'stop') usePomodoroStore.getState().reset(id, id === 'break' ? 5 * 60 : 25 * 60)
  params.delete('pomodoroAction')
  params.delete('pomodoroId')
  const rest = params.toString()
  window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''))
}

if (usePomodoroStore.persist.hasHydrated()) {
  applyPendingPomodoroUrlAction()
} else {
  usePomodoroStore.persist.onFinishHydration(applyPendingPomodoroUrlAction)
}
