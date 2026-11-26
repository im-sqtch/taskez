import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseYouTubeLink } from '../src/lib/youtubeLink.ts'

test('normalizes supported YouTube video links and timestamps', () => {
  for (const url of ['https://youtu.be/M7lc1UVf-VE', 'https://www.youtube.com/watch?v=M7lc1UVf-VE', 'youtube.com/shorts/M7lc1UVf-VE', 'https://m.youtube.com/live/M7lc1UVf-VE', 'https://music.youtube.com/watch?v=M7lc1UVf-VE', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE']) {
    assert.equal(parseYouTubeLink(url)?.videoId, 'M7lc1UVf-VE')
    assert.equal(parseYouTubeLink(url)?.url, 'https://www.youtube.com/watch?v=M7lc1UVf-VE')
  }
  assert.equal(parseYouTubeLink('https://youtu.be/M7lc1UVf-VE?t=1h2m3s')?.startSeconds, 3723)
  assert.equal(parseYouTubeLink('https://youtu.be/M7lc1UVf-VE?t=90')?.startSeconds, 90)
})

test('accepts playlists and rejects unrelated URLs, scripts and malformed IDs', () => {
  const playlist = 'PL590L5WQmH8fJ54F369BLDSqIwcs-TCfs'
  assert.equal(parseYouTubeLink(`https://youtube.com/playlist?list=${playlist}`)?.playlistId, playlist)
  for (const url of ['', 'https://youtube.com', 'https://youtube.com/watch?v=invalid', 'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE', 'javascript:alert(1)', 'https://example.com/watch?v=M7lc1UVf-VE', 'https://user:password@youtube.com/watch?v=M7lc1UVf-VE', 'https://youtube.com/playlist?list=bad']) assert.equal(parseYouTubeLink(url), null)
})
