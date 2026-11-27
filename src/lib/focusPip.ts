// Janela flutuante (picture-in-picture) do foco: mostra o timer em andamento
// numa janelinha que continua na tela quando a pessoa sai do app — como o
// YouTube faz com vídeos.
//
// Navegadores de celular só permitem picture-in-picture de VÍDEO. Então
// desenhamos o timer num <canvas>, transformamos o canvas em vídeo
// (captureStream) e abrimos esse vídeo na janela flutuante. Play/pause da
// janela controlam o timer; avançar/voltar trocam a música.
//
// No Chrome/Edge de computador existe a API Document Picture-in-Picture, que
// aceita HTML de verdade: lá abrimos um mini painel com botões (ver
// FocusMiniPlayer).
import { FOCUS_TRACKS } from '@/lib/focusMusic'
import { useAuthStore } from '@/store/authStore'
import { usePomodoroStore } from '@/store/pomodoroStore'

export type PipMode = 'document' | 'video'

interface DocumentPictureInPicture {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>
  window: Window | null
}

type WebkitVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: string) => boolean
  webkitSetPresentationMode?: (mode: string) => void
  autoPictureInPicture?: boolean
}

export function pipMode(): PipMode | null {
  if (typeof window === 'undefined') return null
  if ('documentPictureInPicture' in window) return 'document'
  const video = document.createElement('video') as WebkitVideo
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null
  if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') return 'video'
  if (video.webkitSupportsPresentationMode?.('picture-in-picture')) return 'video'
  return null
}

// --- Estado mostrado na janela ---

export interface FocusSnapshot {
  timerId: string | null
  name: string
  secondsLeft: number
  totalSeconds: number
  running: boolean
  trackTitle: string | null
}

export function focusSnapshot(): FocusSnapshot {
  const state = usePomodoroStore.getState()
  const userId = useAuthStore.getState().currentUserId
  const mine = state.definitions.filter((timer) => timer.userId === userId)
  const withState = mine.map((definition) => ({ definition, timer: state.timers[definition.id] }))
  // Prioridade: em andamento → pausado no meio → o primeiro da lista.
  const chosen = withState.find((item) => item.timer?.running)
    ?? withState.find((item) => item.timer && item.timer.secondsLeft > 0 && item.timer.secondsLeft < item.definition.totalSeconds)
    ?? withState[0]
  const track = state.musicEnabled && state.musicSource === 'lofi' ? FOCUS_TRACKS.find((item) => item.id === state.trackId) : undefined
  if (!chosen) return { timerId: null, name: 'Nenhum timer', secondsLeft: 0, totalSeconds: 0, running: false, trackTitle: track?.title ?? null }
  return {
    timerId: chosen.definition.id,
    name: chosen.definition.name,
    secondsLeft: chosen.timer?.secondsLeft ?? chosen.definition.totalSeconds,
    totalSeconds: chosen.definition.totalSeconds,
    running: Boolean(chosen.timer?.running),
    trackTitle: state.musicEnabled ? (state.musicSource === 'youtube' ? 'YouTube' : track?.title ?? null) : null,
  }
}

export function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`
}

export function toggleFocusTimer() {
  const { timerId } = focusSnapshot()
  if (timerId) usePomodoroStore.getState().toggle(timerId)
}

// --- Modo vídeo (celular) ---

const WIDTH = 640
const HEIGHT = 360
let activeVideo: WebkitVideo | null = null
let drawTimer: ReturnType<typeof setInterval> | null = null

function cssColor(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

// Desenha um quadro da janela flutuante (exportado para conferência visual).
export function drawFocusFrame(canvas: HTMLCanvasElement) {
  canvas.width = WIDTH
  canvas.height = HEIGHT
  draw(canvas.getContext('2d')!)
}

function draw(context: CanvasRenderingContext2D) {
  const snap = focusSnapshot()
  // O botão da janela flutuante mostra "pausar" com o timer correndo e "tocar" parado.
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = snap.running ? 'playing' : 'paused'
  const base = cssColor('--color-base-alt', '#151c27')
  const text = cssColor('--color-text', '#f3f6fc')
  const muted = cssColor('--color-text-muted', '#b2bed0')
  const accent = cssColor('--color-accent', '#7c5cff')
  const track = cssColor('--color-surface-alt', '#273345')
  const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'

  context.fillStyle = base
  context.fillRect(0, 0, WIDTH, HEIGHT)

  context.fillStyle = accent
  context.font = `700 22px ${font}`
  context.textBaseline = 'alphabetic'
  context.fillText('TaskEz · Foco', 36, 52)
  context.fillStyle = muted
  context.font = `600 22px ${font}`
  const status = !snap.timerId ? 'Crie um timer no app' : snap.running ? 'Em andamento' : snap.secondsLeft === 0 ? 'Concluído' : 'Pausado'
  context.textAlign = 'right'
  context.fillText(status, WIDTH - 36, 52)
  context.textAlign = 'left'

  context.fillStyle = text
  context.font = `800 132px ${font}`
  context.fillText(formatClock(snap.secondsLeft), 32, 200)

  context.fillStyle = muted
  context.font = `600 28px ${font}`
  context.fillText(truncate(context, snap.name, WIDTH - 72), 36, 250)

  const progress = snap.totalSeconds ? 1 - snap.secondsLeft / snap.totalSeconds : 0
  context.fillStyle = track
  roundRect(context, 36, 280, WIDTH - 72, 10, 5)
  context.fillStyle = accent
  roundRect(context, 36, 280, Math.max(10, (WIDTH - 72) * progress), 10, 5)

  if (snap.trackTitle) {
    context.fillStyle = muted
    context.font = `500 22px ${font}`
    context.fillText(truncate(context, `♪ ${snap.trackTitle}`, WIDTH - 72), 36, 330)
  }
}

function truncate(context: CanvasRenderingContext2D, value: string, max: number) {
  if (context.measureText(value).width <= max) return value
  let result = value
  while (result.length > 1 && context.measureText(`${result}…`).width > max) result = result.slice(0, -1)
  return `${result}…`
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.fill()
}

function setMediaSession(handlers: boolean) {
  if (!('mediaSession' in navigator)) return
  const session = navigator.mediaSession
  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try { session.setActionHandler(action, handler) } catch { /* ação não suportada */ }
  }
  set('play', handlers ? () => toggleFocusTimer() : null)
  set('pause', handlers ? () => toggleFocusTimer() : null)
  set('nexttrack', handlers ? () => usePomodoroStore.getState().nextTrack(1) : null)
  set('previoustrack', handlers ? () => usePomodoroStore.getState().nextTrack(-1) : null)
}

async function openVideoPip(): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')!
  draw(context)
  const video = document.createElement('video') as WebkitVideo
  video.muted = true
  video.playsInline = true
  video.autoPictureInPicture = true
  video.srcObject = canvas.captureStream(4)
  // Fora da tela, mas no documento (o Safari exige o vídeo anexado).
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0'
  document.body.appendChild(video)
  await video.play()

  drawTimer = setInterval(() => draw(context), 250)
  activeVideo = video
  setMediaSession(true)

  // Play/pause tocados na própria janela flutuante controlam o timer.
  // (Onde a Media Session não assume o botão, o vídeo é pausado: alterna o
  // timer e volta a "tocar" o vídeo para a janela continuar atualizando.)
  video.addEventListener('pause', () => {
    if (!activeVideo) return
    toggleFocusTimer()
    void video.play().catch(() => {})
  })

  const cleanup = () => {
    if (drawTimer) clearInterval(drawTimer)
    drawTimer = null
    setMediaSession(false)
    video.remove()
    if (activeVideo === video) activeVideo = null
  }
  video.addEventListener('leavepictureinpicture', cleanup)
  video.addEventListener('webkitpresentationmodechanged', () => {
    if ((video as unknown as { webkitPresentationMode?: string }).webkitPresentationMode === 'inline') cleanup()
  })

  if (typeof video.requestPictureInPicture === 'function' && document.pictureInPictureEnabled) await video.requestPictureInPicture()
  else video.webkitSetPresentationMode?.('picture-in-picture')
}

// --- Abrir/fechar ---

export async function openFocusPip(renderDocument?: (pipWindow: Window) => () => void): Promise<boolean> {
  const mode = pipMode()
  if (!mode) return false
  if (mode === 'document' && renderDocument) {
    const api = (window as unknown as { documentPictureInPicture: DocumentPictureInPicture }).documentPictureInPicture
    if (api.window) { api.window.focus(); return true }
    const pipWindow = await api.requestWindow({ width: 340, height: 240 })
    // Leva o CSS do app para a janela nova.
    for (const node of document.querySelectorAll('style, link[rel="stylesheet"]')) pipWindow.document.head.appendChild(node.cloneNode(true))
    pipWindow.document.documentElement.dataset.theme = document.documentElement.dataset.theme ?? 'dark'
    const unmount = renderDocument(pipWindow)
    pipWindow.addEventListener('pagehide', unmount)
    return true
  }
  if (activeVideo) return true
  await openVideoPip()
  return true
}
