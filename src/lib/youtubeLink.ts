export interface YouTubeLink {
  videoId?: string
  playlistId?: string
  startSeconds: number
  url: string
}

export function parseYouTubeLink(value: string): YouTubeLink | null {
  try {
    const input = value.trim()
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) return null
    const path = url.pathname.split('/').filter(Boolean)
    const candidate = host === 'youtu.be' ? path[0] : ['shorts', 'embed', 'live'].includes(path[0] ?? '') ? path[1] : url.searchParams.get('v')
    const videoId = candidate && /^[\w-]{11}$/.test(candidate) ? candidate : undefined
    const list = url.searchParams.get('list')
    const playlistId = list && /^[\w-]{10,150}$/.test(list) ? list : undefined
    if (!videoId && !playlistId) return null
    const rawStart = url.searchParams.get('t') ?? url.searchParams.get('start') ?? ''
    const time = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(rawStart)
    const startSeconds = Math.min(86400, /^\d+$/.test(rawStart) ? Number(rawStart) : time ? Number(time[1] ?? 0) * 3600 + Number(time[2] ?? 0) * 60 + Number(time[3] ?? 0) : 0)
    const canonical = new URL(videoId ? 'https://www.youtube.com/watch' : 'https://www.youtube.com/playlist')
    if (videoId) canonical.searchParams.set('v', videoId)
    if (playlistId) canonical.searchParams.set('list', playlistId)
    if (startSeconds) canonical.searchParams.set('t', String(startSeconds))
    return { videoId, playlistId, startSeconds, url: canonical.href }
  } catch { return null }
}
