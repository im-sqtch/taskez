import { parseYouTubeLink } from '@/lib/youtubeLink'

type PlayerEvent = 'playing' | 'loading' | 'paused' | 'error' | 'blocked'
interface Player {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (volume: number) => void
  setLoop: (loop: boolean) => void
  loadVideoById: (options: object) => void
  cueVideoById: (options: object) => void
  loadPlaylist: (options: object) => void
  cuePlaylist: (options: object) => void
  nextVideo: () => void
  previousVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
  getIframe: () => HTMLIFrameElement
}
interface YouTubeAPI { Player: new (host: HTMLElement, options: object) => Player }
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void }
let apiPromise: Promise<YouTubeAPI> | null = null
let player: Player | null = null
let ready = false
let loadedUrl = ''
let appliedPlaying = false
let desired = { url: '', volume: 0.35, playing: false }
let listener: (event: PlayerEvent, code?: number) => void = () => {}

function loadAPI(): Promise<YouTubeAPI> {
  const target = window as YouTubeWindow
  if (target.YT?.Player) return Promise.resolve(target.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const previous = target.onYouTubeIframeAPIReady
    let finished = false
    const timeout = window.setTimeout(() => finish(new Error('YouTube indisponível')), 15000)
    function finish(error?: Error) {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      target.onYouTubeIframeAPIReady = previous
      if (error || !target.YT?.Player) {
        script.remove()
        apiPromise = null
        reject(error ?? new Error('Player indisponível'))
      } else resolve(target.YT)
    }
    target.onYouTubeIframeAPIReady = () => { try { previous?.() } finally { finish() } }
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => finish(new Error('Falha ao carregar o YouTube'))
    document.head.appendChild(script)
  })
  return apiPromise
}

function applyPlayback() {
  if (!player || !ready) return
  const link = parseYouTubeLink(desired.url)
  if (!link) { player.pauseVideo(); return }
  player.setVolume(desired.volume * 100)
  if (loadedUrl !== desired.url) {
    loadedUrl = desired.url
    appliedPlaying = desired.playing
    if (link.playlistId) {
      const options = { list: link.playlistId, listType: 'playlist', index: 0, startSeconds: link.startSeconds }
      if (desired.playing) player.loadPlaylist(options)
      else player.cuePlaylist(options)
      player.setLoop(true)
    } else {
      const options = { videoId: link.videoId, startSeconds: link.startSeconds }
      if (desired.playing) player.loadVideoById(options)
      else player.cueVideoById(options)
    }
  } else if (appliedPlaying !== desired.playing) {
    appliedPlaying = desired.playing
    if (desired.playing) player.playVideo()
    else player.pauseVideo()
  }
}

export function setFocusYouTubeListener(callback: typeof listener) { listener = callback }

export function syncFocusYouTube(url: string, volume: number, playing: boolean) {
  const starting = playing && (!desired.playing || desired.url !== url)
  desired = { url, volume, playing }
  if (starting) listener('loading')
  applyPlayback()
}

export function skipFocusYouTube(direction = 1) {
  if (!ready || !parseYouTubeLink(desired.url)?.playlistId) return
  if (direction < 0) player?.previousVideo()
  else player?.nextVideo()
  if (!desired.playing) player?.pauseVideo()
}

export function resumeFocusYouTube() {
  if (ready && desired.playing) player?.playVideo()
}

export function mountFocusYouTube(host: HTMLElement): () => void {
  let disposed = false
  const element = document.createElement('div')
  host.replaceChildren(element)
  void loadAPI().then((api) => {
    if (disposed) return
    const instance = new api.Player(element, {
      width: '100%', height: '200',
      playerVars: { playsinline: 1, origin: window.location.origin, controls: 1, autoplay: 0 },
      events: {
        onReady: () => {
          if (disposed) return
          ready = true
          const iframe = instance.getIframe()
          iframe.title = 'Player de música do YouTube'
          iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
          applyPlayback()
        },
        onStateChange: ({ data }: { data: number }) => {
          if (disposed) return
          if (data === 1) {
            if (!desired.playing) { instance.pauseVideo(); return }
            listener('playing')
          } else if (data === 3 && desired.playing) listener('loading')
          else if (data === 2 && desired.playing) listener('paused')
          else if (data === 0 && desired.playing && !parseYouTubeLink(desired.url)?.playlistId) {
            instance.seekTo(parseYouTubeLink(desired.url)?.startSeconds ?? 0, true)
            instance.playVideo()
          }
        },
        onError: ({ data }: { data: number }) => { if (!disposed) listener('error', data) },
        onAutoplayBlocked: () => { if (!disposed && desired.playing) listener('blocked') },
      },
    })
    player = instance
  }).catch(() => { if (!disposed) listener('error') })
  return () => {
    disposed = true
    player?.destroy()
    player = null
    ready = false
    loadedUrl = ''
    appliedPlaying = false
    host.replaceChildren()
  }
}
