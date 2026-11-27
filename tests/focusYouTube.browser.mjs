// Run against Vite with PLAYWRIGHT_MODULE pointing to an installed playwright package.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
// PLAYWRIGHT_CHANNEL vazio usa o Chromium do próprio Playwright (padrão: Edge).
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })

const createdAt = '2026-09-26T12:00:00.000Z'
const responses = {
  workspace_members: [{
    workspace_id: 'workspace-1', role: 'owner',
    workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', default_assignee_id: null, created_by: 'test-user', created_at: createdAt },
  }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Teste', role: 'Organizador', avatar_color: '#123456', status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
  projects: [{ id: 'project-1', workspace_id: 'workspace-1', name: 'Projeto teste', description: null, color: '#7c5cff', icon: null, status: 'active', due_date: null, member_ids: [], links: [], created_at: createdAt, order: 0, completion_ack: false, recurrence: null, series_id: null, deleted_at: null, deleted_by: null }],
  tasks: [{ id: 'task-1', workspace_id: 'workspace-1', project_id: 'project-1', title: 'Tarefa teste', description: null, status: 'todo', not_fulfilled: false, priority: 'medium', due_date: '2026-11-26T00:00:00.000Z', assignee_ids: [], subtasks: [], comments: [], links: [], created_at: createdAt, updated_at: createdAt, completed_at: null, order: 0, recurrence: null, series_id: null, deleted_at: null, deleted_by: null }],
  chat_messages: [{ id: 'message-1', workspace_id: 'workspace-1', project_id: 'project-1', author_id: 'test-user', text: 'Mensagem', created_at: createdAt }],
}

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({ contentType: 'application/javascript', body: `import { create } from '/node_modules/.vite/deps/zustand.js'; const user = { id: 'test-user', name: 'Teste', avatarColor: '#123456' }; export const useAuthStore = create((set,get) => ({ currentUserId: user.id, profile:user, authReady:true, hasHydrated:true, hasSeenOnboarding:true, currentUser:()=>get().profile }));` }))
    await context.route('**/*.supabase.co/**', (route) => {
      const table = Object.keys(responses).find((name) => route.request().url().includes(`/rest/v1/${name}`))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table ? responses[table] : []) })
    })
    if (!process.env.FOCUS_YOUTUBE_LIVE) await context.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({
      contentType: 'application/javascript', body: `
        window.ytCalls = []; window.ytInstances = [];
        window.YT = { Player: class {
          constructor(host, options) {
            this.events = options.events;
            this.frame = document.createElement('iframe'); this.frame.src = 'about:blank';
            host.replaceWith(this.frame); window.ytInstances.push(this);
            setTimeout(() => this.events.onReady({target:this}), 0);
          }
          record(name, value) { window.ytCalls.push({name, value}); }
          getIframe() { return this.frame; }
          playVideo() { this.record('play'); this.events.onStateChange({data:1}); }
          pauseVideo() { this.record('pause'); this.events.onStateChange({data:2}); }
          setVolume(v) { this.record('volume',v); }
          setLoop(v) { this.record('loop',v); }
          cueVideoById(v) { this.record('cueVideo',v); }
          loadVideoById(v) { this.record('loadVideo',v); this.playVideo(); }
          cuePlaylist(v) { this.record('cuePlaylist',v); }
          loadPlaylist(v) { this.record('loadPlaylist',v); this.playVideo(); }
          nextVideo() { this.record('next'); }
          previousVideo() { this.record('previous'); }
          seekTo(v) { this.record('seek',v); }
          destroy() { this.record('destroy'); this.frame.remove(); }
        }}; window.onYouTubeIframeAPIReady();`,
    }))
    const page = await context.newPage()
    page.setDefaultTimeout(12000)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/dashboard`)
    await page.getByRole('button', { name: 'Personalizar painel' }).waitFor()
    const modules = await page.evaluate(() => Object.fromEntries(['dataStore', 'pomodoroStore'].map((name) => [name, performance.getEntriesByType('resource').find((entry) => entry.name.includes(`/src/store/${name}.ts`))?.name ?? `/src/store/${name}.ts`])))
    await page.evaluate(async (modules) => {
      const store = (await import(modules.dataStore)).useDataStore
      window.focusStore = (await import(modules.pomodoroStore)).usePomodoroStore
      const layout = { widgets: [{ id: 'focus-test', type: 'utility', size: 'M', visible: true, order: 0 }] }
      store.setState({ layouts: { 'workspace-1': { desktop: layout, mobile: layout } } })
      window.focusStore.getState().addTimer('Teste YouTube', 5)
    }, modules)
    await page.getByRole('checkbox', { name: 'Música lo-fi' }).check()
    await page.getByLabel('Fonte da música').selectOption('youtube')
    await page.getByLabel('Link do YouTube', { exact: true }).fill('https://example.com')
    await page.getByRole('button', { name: 'Usar link do YouTube' }).click()
    await page.getByText('Cole um link válido de vídeo ou playlist do YouTube.').waitFor()
    await page.getByLabel('Link do YouTube', { exact: true }).fill('https://youtu.be/M7lc1UVf-VE?t=30')
    await page.getByRole('checkbox', { name: 'Vídeo colapsado', exact: true }).check()
    await page.getByRole('button', { name: 'Usar link do YouTube' }).click()
    await page.locator('[data-youtube-player] iframe').waitFor({ state: 'attached' })
    assert.equal(await page.getByRole('complementary', { name: 'Player do YouTube' }).locator('details').evaluate((el) => el.open), false)
    if (!process.env.FOCUS_YOUTUBE_LIVE) assert.equal(await page.evaluate(() => window.ytCalls.some((call) => call.name === 'play')), false)
    await page.getByRole('button', { name: 'Iniciar Teste YouTube', exact: true }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing' || window.focusStore.getState().musicStatus === 'error')
    if (process.env.FOCUS_YOUTUBE_LIVE) {
      console.log('LIVE YouTube outcome', viewport.width, await page.evaluate(() => ({ status: window.focusStore.getState().musicStatus, error: window.focusStore.getState().musicError })))
      await context.close()
      continue
    }
    assert.equal(await page.evaluate(() => window.focusStore.getState().musicStatus), 'playing')
    const instanceCount = await page.evaluate(() => window.ytInstances.length)
    await page.getByText('YouTube · expandir vídeo', { exact: true }).click()
    await page.locator('[data-youtube-player] iframe').waitFor()
    await page.getByText('YouTube · recolher vídeo', { exact: true }).click()
    assert.equal(await page.evaluate(() => window.ytInstances.length), instanceCount, 'collapsing must retain the player')
    await page.getByRole('link', { name: 'Calendário', exact: true }).click()
    await page.getByRole('heading', { name: 'Calendário', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.ytInstances.length), instanceCount, 'navigation must retain the player')
    await page.getByRole('link', { name: 'Início', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar Teste YouTube', exact: true }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'paused')
    await page.getByLabel('Link do YouTube', { exact: true }).fill('https://www.youtube.com/playlist?list=PL590L5WQmH8fJ54F369BLDSqIwcs-TCfs')
    await page.getByRole('button', { name: 'Usar link do YouTube' }).click()
    await page.getByRole('button', { name: 'Iniciar Teste YouTube', exact: true }).click()
    await page.waitForFunction(() => window.ytCalls.some((call) => ['cuePlaylist', 'loadPlaylist'].includes(call.name)))
    await page.getByRole('button', { name: 'Próxima música' }).click()
    assert.ok(await page.evaluate(() => window.ytCalls.some((call) => call.name === 'next')))
    await page.evaluate(() => window.ytInstances.at(-1).events.onError({ data: 150 }))
    await page.getByText('O autor não permite reproduzir este vídeo em outros sites. Escolha outro link.').waitFor()
    await page.getByRole('button', { name: 'Tentar tocar novamente' }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    await page.evaluate(() => window.ytInstances.at(-1).events.onAutoplayBlocked())
    await page.getByText('O navegador bloqueou a reprodução. Tente novamente ou mostre o vídeo e toque no play do YouTube.').waitFor()
    await page.getByRole('button', { name: 'Tentar tocar novamente' }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    await page.getByLabel('Fonte da música').selectOption('lofi')
    await page.getByRole('complementary', { name: 'Player do YouTube' }).waitFor({ state: 'detached' })
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    await page.getByLabel('Fonte da música').selectOption('youtube')
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    await page.getByRole('button', { name: 'Pausar Teste YouTube', exact: true }).click()
    await page.reload()
    await page.getByRole('complementary', { name: 'Player do YouTube' }).waitFor()
    assert.equal(await page.getByRole('complementary', { name: 'Player do YouTube' }).locator('details').evaluate((el) => el.open), false)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual(errors, [])
    console.log(`PASS ${viewport.width}: links, validation, collapsed player, timer synchronization, navigation, playlist controls, embed errors, autoplay recovery, source switching and saved preferences`)
    await context.close()
  }
} finally { await browser.close() }

