export const FOCUS_TRACKS = [
  { id: '2-am-debug-loop', title: '2 AM Debug Loop' },
  { id: 'coffee-ring-notebook', title: 'Coffee Ring Notebook' },
  { id: 'chapter-by-lamplight', title: 'Chapter By Lamplight' },
  { id: 'first-coffee-thoughts', title: 'First Coffee Thoughts' },
  { id: 'terminal-rain', title: 'Terminal Rain' },
].map((track) => ({ ...track, src: `/audio/lofi/${track.id}.mp3`, artist: 'Open Lo-Fi · btahir' }))

export const FOCUS_MUSIC_SOURCE = 'https://github.com/btahir/open-lofi'

export function nextFocusTrack(id: string, direction = 1): string {
  const index = Math.max(0, FOCUS_TRACKS.findIndex((track) => track.id === id))
  return FOCUS_TRACKS[(index + direction + FOCUS_TRACKS.length) % FOCUS_TRACKS.length]!.id
}
