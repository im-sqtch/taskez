// Janela flutuante do foco: abre como vídeo picture-in-picture (celular) ou
// como mini painel (Document Picture-in-Picture, Chrome/Edge de computador).
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
// PLAYWRIGHT_CHANNEL vazio usa o Chromium do próprio Playwright (padrão: Edge).
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })

const createdAt = '2026-09-26T12:00:00.000Z'
const responses = {
  workspace_members: [{ workspace_id: 'workspace-1', role: 'owner', workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', default_assignee_id: null, created_by: 'test-user', created_at: createdAt } }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Teste', role: 'Organizador', avatar_color: '#123456', status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
  focus_timers: [{ id: 'f1', user_id: 'test-user', name: 'Leitura profunda', total_seconds: 1500, seconds_left: 1500, running: false, end_at: null, scheduled_id: null, version: 1, created_at: createdAt }],
}

try {
  for (const mode of ['video', 'document']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Sao_Paulo' })
    await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `import { create } from '/node_modules/.vite/deps/zustand.js';
        const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
        export const useAuthStore = create((set, get) => ({ currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
          hasSeenOnboarding: true, currentUser: () => get().profile }));`,
    }))
    await context.route('**/*.supabase.co/**', (route) => {
      const request = route.request()
      const table = Object.keys(responses).find((name) => request.url().includes(`/rest/v1/${name}`))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table && request.method() === 'GET' ? responses[table] : []) })
    })
    // Simula o celular: sem a API de janela com HTML, só picture-in-picture de vídeo.
    if (mode === 'video') await context.addInitScript(() => { delete window.documentPictureInPicture })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/dashboard`)
    const button = page.getByRole('button', { name: 'Abrir janela flutuante do timer' })
    await button.waitFor()
    await button.click()
    if (mode === 'video') {
      await page.waitForFunction(() => Boolean(document.pictureInPictureElement))
      // O botão da janela (Media Session) inicia e pausa o timer.
      await page.getByRole('button', { name: 'Iniciar Leitura profunda', exact: true }).click()
      await page.waitForFunction(() => navigator.mediaSession.playbackState === 'playing')
      console.log('PASS vídeo: janela flutuante aberta e acompanhando o timer')
    } else {
      await page.waitForFunction(() => Boolean(window.documentPictureInPicture?.window))
      const text = await page.evaluate(() => window.documentPictureInPicture.window.document.body.innerText)
      assert.match(text, /25:00/)
      assert.match(text, /Leitura profunda/)
      console.log('PASS documento: mini painel com o timer')
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
} finally {
  await browser.close()
}
