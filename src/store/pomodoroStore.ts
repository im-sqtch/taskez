import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fireAndForget, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { FOCUS_TRACKS, nextFocusTrack } from '@/lib/focusMusic'
import { setFocusAudioListener, syncFocusAudio } from '@/lib/focusAudio'
import { resumeFocusYouTube, setFocusYouTubeListener, skipFocusYouTube, syncFocusYouTube } from '@/lib/focusYouTube'
import { parseYouTubeLink } from '@/lib/youtubeLink'

export const MAX_FOCUS_TIMERS = 10
export const MAX_TIMER_MINUTES = 1440

export interface FocusTimerDefinition {
  id: string
  userId: string
  name: string
  totalSeconds: number
}

interface TimerState {
  secondsLeft: number
  running: boolean
  // Timestamp (ms) em que o timer chega a zero. Usado para calcular o tempo
  // restante a partir do relógio real, e não de contagem de ticks — assim o
  // valor fica correto mesmo que a aba fique em segundo plano ou o widget
  // seja desmontado e remontado (troca de página no dashboard).
  endAt: number | null
  runId?: string
  // Id da linha em `scheduled_notifications` que vai disparar o push de
  // conclusão — guardado para poder cancelar ao pausar/reiniciar/terminar.
  scheduledId?: string
}

interface PomodoroState {
  definitions: FocusTimerDefinition[]
  timers: Record<string, TimerState>
  musicEnabled: boolean
  musicSource: 'lofi' | 'youtube'
  youtubeUrls: Record<string, string>
  youtubeVideoCollapsed: boolean
  trackId: string
  volume: number
  musicError: string | null
  musicStatus: 'paused' | 'loading' | 'playing' | 'error'
  addTimer: (name: string, minutes: number) => boolean
  updateTimer: (id: string, name: string, minutes: number) => boolean
  removeTimer: (id: string) => void
  setMusicEnabled: (enabled: boolean) => void
  setMusicSource: (source: 'lofi' | 'youtube') => void
  setYouTubeUrl: (url: string) => boolean
  setYouTubeVideoCollapsed: (hidden: boolean) => void
  setTrack: (id: string) => void
  nextTrack: (direction?: number) => void
  setVolume: (volume: number) => void
  start: (id: string) => void
  toggle: (id: string) => void
  pause: (id: string) => void
  reset: (id: string) => void
}

function ownsTimer(state: PomodoroState, id: string) {
  return state.definitions.find((timer) => timer.id === id && timer.userId === useAuthStore.getState().currentUserId)
}

function validTimer(name: string, minutes: number) {
  return Boolean(name.trim()) && name.trim().length <= 60 && Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_TIMER_MINUTES
}

function getTimer(state: PomodoroState, id: string, totalSeconds: number): TimerState {
  return state.timers[id] ?? { secondsLeft: totalSeconds, running: false, endAt: null }
}

// Contexto único reaproveitado entre chamadas. Criar um `AudioContext` novo a
// cada beep (como antes) nasce em estado "suspended" quando não é resultado
// direto de um gesto do usuário — que é exatamente o caso aqui, já que o beep
// dispara de dentro do `setInterval` do módulo, não de um clique. O navegador
// então nunca toca o som de verdade, sem erro nenhum visível. A saída é criar
// o contexto (e "destravá-lo") uma vez, dentro de um clique de verdade (ver
// `unlockAudio`, chamado em `start`), e reaproveitar esse mesmo contexto —
// já destravado — quando o beep precisar tocar minutos depois.
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextCtor()
  }
  return sharedAudioContext
}

// Chamado a partir de um clique real (o botão de play) — a única chance
// confiável de tirar o contexto do estado "suspended".
function unlockAudio() {
  try {
    const ctx = getAudioContext()
    if (ctx?.state === 'suspended') void ctx.resume()
  } catch {
    // sem suporte a áudio — ignora
  }
}

function playCompletionSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
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
    // Sem fechar o contexto depois (como antes) — ele é reaproveitado no
    // próximo beep, já destravado.
  } catch {
    // ambiente sem suporte a áudio (ex.: SSR) — falha silenciosamente
  }
}

function labelsFor(id: string): { label: string; title: string; body: string } {
  const label = usePomodoroStore.getState().definitions.find((timer) => timer.id === id)?.name ?? 'Timer'
  return { label, title: `${label}: tempo concluído!`, body: 'O tempo definido para esta sessão chegou ao fim.' }
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
    if (!usePomodoroStore.getState().timers[id]?.running) return
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
    const current = usePomodoroStore.getState().timers[id]
    if (current?.running) return
    list.forEach((n) => n.close())
  } catch {
    // ignora
  }
}

// Sinal imediato de conclusão em primeiro plano — não depende do push
// agendado (que tem até ~1min de atraso e, em alguns aparelhos, só chega
// quando o app é reaberto). Reaproveita a mesma tag da notificação "em
// andamento", então substitui em vez de empilhar.
async function showCompletedNotification(id: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return
  const { title, body } = labelsFor(id)
  try {
    const reg = await navigator.serviceWorker.ready
    const current = usePomodoroStore.getState().timers[id]
    if (!current || current.running || current.secondsLeft !== 0) return
    await reg.showNotification(title, {
      tag: `pomodoro-${id}`,
      renotify: true,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      body,
      data: { pomodoroId: id },
    } as NotificationOptions)
  } catch {
    // sem Service Worker ativo/sem suporte — o beep sonoro já cobre o aviso
  }
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      definitions: [],
      timers: {},
      musicEnabled: false,
      musicSource: 'lofi',
      youtubeUrls: {},
      youtubeVideoCollapsed: false,
      trackId: FOCUS_TRACKS[0]!.id,
      volume: 0.35,
      musicError: null,
      musicStatus: 'paused',
      addTimer: (name, minutes) => {
        const userId = useAuthStore.getState().currentUserId
        if (!userId || !validTimer(name, minutes) || get().definitions.filter((timer) => timer.userId === userId).length >= MAX_FOCUS_TIMERS) return false
        const definition = { id: crypto.randomUUID(), userId, name: name.trim(), totalSeconds: minutes * 60 }
        set((state) => ({ definitions: [...state.definitions, definition] }))
        return true
      },
      updateTimer: (id, name, minutes) => {
        const definition = ownsTimer(get(), id)
        if (!definition || !validTimer(name, minutes)) return false
        const wasRunning = get().timers[id]?.running
        const durationChanged = definition.totalSeconds !== minutes * 60
        get().pause(id)
        set((state) => ({ definitions: state.definitions.map((timer) => timer.id === id ? { ...timer, name: name.trim(), totalSeconds: minutes * 60 } : timer) }))
        if (durationChanged) get().reset(id)
        else if (wasRunning) get().start(id)
        return true
      },
      removeTimer: (id) => {
        if (!ownsTimer(get(), id)) return
        cancelScheduledPush(get().timers[id]?.scheduledId)
        void closeRunningNotification(id)
        set((state) => ({ definitions: state.definitions.filter((timer) => timer.id !== id), timers: Object.fromEntries(Object.entries(state.timers).filter(([key]) => key !== id)) }))
      },
      setMusicEnabled: (enabled) => {
        set({ musicEnabled: enabled, musicError: null })
        if (enabled && get().musicSource === 'youtube') resumeFocusYouTube()
      },
      setMusicSource: (source) => set({ musicSource: source, musicError: null, musicStatus: 'paused' }),
      setYouTubeUrl: (url) => {
        const userId = useAuthStore.getState().currentUserId
        const link = parseYouTubeLink(url)
        if (!userId || !link) return false
        set((state) => ({ youtubeUrls: { ...state.youtubeUrls, [userId]: link.url }, musicSource: 'youtube', musicError: null, musicStatus: 'paused' }))
        return true
      },
      setYouTubeVideoCollapsed: (hidden) => set({ youtubeVideoCollapsed: hidden }),
      setTrack: (id) => { if (FOCUS_TRACKS.some((track) => track.id === id)) set({ trackId: id, musicError: null }) },
      nextTrack: (direction = 1) => {
        if (get().musicSource === 'youtube') skipFocusYouTube(direction)
        else get().setTrack(nextFocusTrack(get().trackId, direction))
      },
      setVolume: (volume) => { if (Number.isFinite(volume)) set({ volume: Math.max(0, Math.min(1, volume)) }) },
      start: (id) => {
        const definition = ownsTimer(get(), id)
        if (!definition || get().timers[id]?.running) return
        const totalSeconds = definition.totalSeconds
        // Chamado direto do clique no botão de play — o único momento em que
        // dá pra destravar o áudio de forma confiável (ver comentário acima
        // de `unlockAudio`).
        unlockAudio()
        const current = getTimer(get(), id, totalSeconds)
        const secondsLeft = current.secondsLeft > 0 ? current.secondsLeft : totalSeconds
        const endAt = Date.now() + secondsLeft * 1000
        const runId = crypto.randomUUID()
        set((state) => ({
          timers: { ...state.timers, [id]: { secondsLeft, running: true, endAt, runId, scheduledId: undefined } },
          musicError: null,
        }))
        void showRunningNotification(id)
        void schedulePush(id, endAt).then((scheduledId) => {
          // Só anexa o agendamento se este ainda for o mesmo ciclo — evita
          // reanexar a um timer que já foi pausado/reiniciado nesse meio-tempo.
          const timerNow = usePomodoroStore.getState().timers[id]
          if (!scheduledId) return
          if (!timerNow?.running || timerNow.runId !== runId) {
            cancelScheduledPush(scheduledId)
            return
          }
          usePomodoroStore.setState((state) => ({
            timers: { ...state.timers, [id]: { ...state.timers[id]!, scheduledId } },
          }))
        })
      },
      pause: (id) => {
        if (!ownsTimer(get(), id)) return
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
      toggle: (id) => {
        const definition = ownsTimer(get(), id)
        if (!definition) return
        const current = getTimer(get(), id, definition.totalSeconds)
        if (current.running) {
          get().pause(id)
        } else {
          get().start(id)
        }
      },
      reset: (id) => {
        const definition = ownsTimer(get(), id)
        if (!definition) return
        const totalSeconds = definition.totalSeconds
        cancelScheduledPush(get().timers[id]?.scheduledId)
        set((state) => ({
          timers: { ...state.timers, [id]: { secondsLeft: totalSeconds, running: false, endAt: null, scheduledId: undefined } },
        }))
        void closeRunningNotification(id)
      },
    }),
    {
      name: 'taskez-pomodoro',
      version: 1,
      migrate: (persisted) => {
        const legacy = persisted as { timers?: Record<string, TimerState> }
        for (const [id, timer] of Object.entries(legacy?.timers ?? {})) {
          cancelScheduledPush(timer.scheduledId)
          void closeRunningNotification(id)
        }
        return { timers: {}, definitions: [], musicEnabled: false, musicSource: 'lofi' as const, youtubeUrls: {}, youtubeVideoCollapsed: false, trackId: FOCUS_TRACKS[0]!.id, volume: 0.35 }
      },
      partialize: (state) => ({ definitions: state.definitions, timers: state.timers, musicEnabled: state.musicEnabled, musicSource: state.musicSource, youtubeUrls: state.youtubeUrls, youtubeVideoCollapsed: state.youtubeVideoCollapsed, trackId: state.trackId, volume: state.volume }),
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
        if (changed) state.timers = timers
      },
    },
  ),
)

// Loop único no nível do módulo (não em um efeito de componente), garantindo
// que a contagem continue rodando mesmo enquanto o widget do Pomodoro está
// desmontado — por exemplo, ao navegar para outra aba do dashboard.
const tickInterval = setInterval(() => {
  const state = usePomodoroStore.getState()
  let changed = false
  const nextTimers = { ...state.timers }
  for (const [id, timer] of Object.entries(state.timers)) {
    if (!timer.running || timer.endAt === null || !ownsTimer(state, id)) continue
    const secondsLeft = Math.max(0, Math.round((timer.endAt - Date.now()) / 1000))
    if (secondsLeft <= 0) {
      nextTimers[id] = { secondsLeft: 0, running: false, endAt: null, scheduledId: undefined }
      changed = true
      playCompletionSound()
      // Terminou em primeiro plano — cancela o push agendado pra não vir uma
      // notificação redundante minutos depois (granularidade do pg_cron), e
      // mostra o aviso de conclusão na hora em vez de esperar o push.
      cancelScheduledPush(timer.scheduledId)
      void showCompletedNotification(id)
    } else if (secondsLeft !== timer.secondsLeft) {
      nextTimers[id] = { ...timer, secondsLeft }
      changed = true
    }
  }
  if (changed) usePomodoroStore.setState({ timers: nextTimers })
}, 250)

function syncMusic() {
  const state = usePomodoroStore.getState()
  const hasRunningTimer = Object.entries(state.timers).some(([id, timer]) => timer.running && ownsTimer(state, id))
  const playing = state.musicEnabled && hasRunningTimer && !state.musicError
  const userId = useAuthStore.getState().currentUserId
  const youtubeUrl = userId ? state.youtubeUrls[userId] ?? '' : ''
  syncFocusAudio(state.trackId, state.volume, playing && state.musicSource === 'lofi')
  syncFocusYouTube(youtubeUrl, state.volume, playing && state.musicSource === 'youtube' && Boolean(youtubeUrl))
  if (!playing && !state.musicError && state.musicStatus !== 'paused') usePomodoroStore.setState({ musicStatus: 'paused' })
}

setFocusAudioListener((event) => {
  const state = usePomodoroStore.getState()
  if (event === 'ended') state.nextTrack()
  else if (event === 'error') usePomodoroStore.setState({ musicError: 'Não foi possível tocar a música. Tente novamente ou escolha outra faixa.', musicStatus: 'error' })
  else if (state.musicStatus !== event) usePomodoroStore.setState({ musicStatus: event })
})
setFocusYouTubeListener((event, code) => {
  if (usePomodoroStore.getState().musicSource !== 'youtube') return
  if (event === 'error' || event === 'blocked') {
    const message = event === 'blocked' ? 'O navegador bloqueou a reprodução. Tente novamente ou mostre o vídeo e toque no play do YouTube.'
      : code === 100 ? 'Este vídeo ou playlist não está disponível.'
      : code === 101 || code === 150 ? 'O autor não permite reproduzir este vídeo em outros sites. Escolha outro link.'
      : code === 153 ? 'O YouTube não conseguiu identificar o site. Verifique as configurações de privacidade do navegador.'
      : 'Não foi possível carregar o YouTube. Verifique sua conexão e tente novamente.'
    usePomodoroStore.setState({ musicError: message, musicStatus: 'error' })
  } else if (usePomodoroStore.getState().musicStatus !== event) usePomodoroStore.setState({ musicStatus: event })
})
const unsubscribeMusic = usePomodoroStore.subscribe(syncMusic)
const unsubscribeAuth = useAuthStore.subscribe?.((auth, previous) => {
  if (auth.currentUserId === previous.currentUserId) return
  // Restoring authentication on reload must preserve the running countdown.
  if (!previous.currentUserId) { syncMusic(); return }
  const state = usePomodoroStore.getState()
  const timers = { ...state.timers }
  for (const [id, timer] of Object.entries(timers)) {
    if (!timer.running) continue
    cancelScheduledPush(timer.scheduledId)
    void closeRunningNotification(id)
    timers[id] = { secondsLeft: Math.max(0, Math.ceil(((timer.endAt ?? Date.now()) - Date.now()) / 1000)), running: false, endAt: null }
  }
  usePomodoroStore.setState({ timers, musicEnabled: false, musicError: null, musicStatus: 'paused' })
})

if (import.meta.hot) import.meta.hot.dispose(() => {
  clearInterval(tickInterval)
  unsubscribeMusic()
  unsubscribeAuth?.()
  syncFocusAudio(usePomodoroStore.getState().trackId, usePomodoroStore.getState().volume, false)
  syncFocusYouTube('', usePomodoroStore.getState().volume, false)
})

// Repasse de "Pausar"/"Encerrar" clicados na notificação do sistema, quando o
// Service Worker encontrou uma aba já aberta (ver public/sw.js).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event.data as { type?: string; action?: string; id?: string } | undefined
    if (payload?.type !== 'pomodoro-action' || !payload.id) return
    if (payload.action === 'pause') usePomodoroStore.getState().pause(payload.id)
    if (payload.action === 'stop') usePomodoroStore.getState().reset(payload.id)
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
  if (action === 'stop') usePomodoroStore.getState().reset(id)
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
