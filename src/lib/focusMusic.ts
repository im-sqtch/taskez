export const FOCUS_TRACKS = [
  { id: '2-am-debug-loop', title: '2 AM Debug Loop' },
  { id: 'coffee-ring-notebook', title: 'Coffee Ring Notebook' },
  { id: 'chapter-by-lamplight', title: 'Chapter By Lamplight' },
  { id: 'first-coffee-thoughts', title: 'First Coffee Thoughts' },
  { id: 'terminal-rain', title: 'Terminal Rain' },
  { id: 'stacks-of-quiet-books', title: 'Stacks of Quiet Books' },
  { id: 'hour-between-clicks', title: 'Hour Between Clicks' },
  { id: 'cursor-after-midnight', title: 'Cursor After Midnight' },
  { id: 'kettle-before-work', title: 'Kettle Before Work' },
  { id: 'margin-notes-at-dusk', title: 'Margin Notes at Dusk' },
  { id: 'graphite-in-the-quiet', title: 'Graphite in the Quiet' },
  { id: 'dog-eared-pages', title: 'Dog-Eared Pages' },
  { id: 'morning-pages', title: 'Morning Pages' },
  { id: 'stacks-of-quiet-hours', title: 'Stacks of Quiet Hours' },
  { id: 'penciled-sunbeams', title: 'Penciled Sunbeams' },
  { id: 'window-seat-daydream', title: 'Window Seat Daydream' },
  { id: 'dust-on-the-morning-keys', title: 'Dust on the Morning Keys' },
  { id: 'paper-lantern-rain', title: 'Paper Lantern Rain' },
  { id: 'teacup-morning-fog', title: 'Teacup Morning Fog' },
  { id: 'last-train-home', title: 'Last Train Home' },
].map((track) => ({ ...track, src: `/audio/lofi/${track.id}.mp3`, artist: 'Open Lo-Fi · btahir' }))

export const FOCUS_MUSIC_SOURCE = 'https://github.com/btahir/open-lofi'

export function nextFocusTrack(id: string, direction = 1): string {
  const index = Math.max(0, FOCUS_TRACKS.findIndex((track) => track.id === id))
  return FOCUS_TRACKS[(index + direction + FOCUS_TRACKS.length) % FOCUS_TRACKS.length]!.id
}
