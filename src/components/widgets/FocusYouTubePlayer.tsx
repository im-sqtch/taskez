import { useEffect, useRef } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { mountFocusYouTube } from '@/lib/focusYouTube'
import { useAuthStore } from '@/store/authStore'
import { usePomodoroStore } from '@/store/pomodoroStore'

export function FocusYouTubePlayer() {
  const userId = useAuthStore((s) => s.currentUserId)
  const source = usePomodoroStore((s) => s.musicSource)
  const url = usePomodoroStore((s) => userId ? s.youtubeUrls[userId] ?? '' : '')
  const collapsed = usePomodoroStore((s) => s.youtubeVideoCollapsed)
  const error = usePomodoroStore((s) => s.musicError)
  const setCollapsed = usePomodoroStore((s) => s.setYouTubeVideoCollapsed)
  const host = useRef<HTMLDivElement>(null)
  const active = source === 'youtube' && Boolean(url) && !error
  useEffect(() => {
    if (!active || !host.current) return
    return mountFocusYouTube(host.current)
  }, [active, userId])
  if (!active) return null
  return (
    <aside aria-label="Player do YouTube" className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-4 z-40 w-[calc(100%-32px)] max-w-sm rounded-2xl border border-border bg-base-alt text-text shadow-xl lg:bottom-4">
      <details open={!collapsed} onToggle={(event) => {
        const next = !event.currentTarget.open
        if (next !== collapsed) setCollapsed(next)
      }}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-t-2xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <span>YouTube · {collapsed ? 'expandir vídeo' : 'recolher vídeo'}</span><ChevronDown size={18} className={collapsed ? '' : 'rotate-180'} aria-hidden="true" />
        </summary>
        <div ref={host} data-youtube-player className="min-h-[200px] w-full overflow-hidden bg-black [&_iframe]:block [&_iframe]:min-h-[200px] [&_iframe]:w-full" />
        <a href={url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 text-xs text-text-muted underline underline-offset-4">Abrir no YouTube<ExternalLink size={13} aria-hidden="true" /></a>
      </details>
    </aside>
  )
}
