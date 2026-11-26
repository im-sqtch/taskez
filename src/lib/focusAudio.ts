import { FOCUS_TRACKS } from '@/lib/focusMusic'

type AudioEvent = 'playing' | 'loading' | 'ended' | 'error'
let audio: HTMLAudioElement | null = null
let activeTrack = ''
let wantsPlayback = false
let requestVersion = 0
let onAudioEvent: (event: AudioEvent) => void = () => {}

export function setFocusAudioListener(listener: typeof onAudioEvent) {
  onAudioEvent = listener
}

// One player for the session, independent of dashboard/widget mounts.
export function syncFocusAudio(trackId: string, volume: number, playing: boolean) {
  const track = FOCUS_TRACKS.find((item) => item.id === trackId)
  if (!track || (!audio && !playing)) return
  if (!audio) {
    audio = new Audio()
    audio.preload = 'none'
    audio.addEventListener('ended', () => { if (wantsPlayback) onAudioEvent('ended') })
    audio.addEventListener('playing', () => { if (wantsPlayback) onAudioEvent('playing') })
    audio.addEventListener('waiting', () => { if (wantsPlayback) onAudioEvent('loading') })
    audio.addEventListener('error', () => { if (wantsPlayback) onAudioEvent('error') })
  }
  audio.volume = Math.min(1, Math.max(0, volume))
  const trackChanged = activeTrack !== trackId
  if (!playing) {
    wantsPlayback = false
    requestVersion++
    audio.pause()
    return
  }
  if (wantsPlayback && !trackChanged) return
  wantsPlayback = true
  const version = ++requestVersion
  if (trackChanged || audio.error) {
    activeTrack = trackId
    audio.src = track.src
    audio.load()
  }
  onAudioEvent('loading')
  void audio.play().catch(() => {
    if (version === requestVersion && wantsPlayback) onAudioEvent('error')
  })
}
