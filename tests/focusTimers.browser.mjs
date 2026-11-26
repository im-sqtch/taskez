// Run against Vite with PLAYWRIGHT_MODULE pointing to an installed playwright package.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
const browser = await chromium.launch({ channel: 'msedge', headless: true })

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
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }, { width: 812, height: 375 }]) {
    const context = await browser.newContext({ viewport, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' })
    await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `import { create } from '/node_modules/.vite/deps/zustand.js';
        const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
        export const useAuthStore = create((set, get) => ({ currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
          hasSeenOnboarding: true, currentUser: () => get().profile }));`,
    }))
    const writes = []
    // Os timers ficam na conta (tabela focus_timers): o mock guarda o que o app
    // grava para que recarregar a página devolva os mesmos timers.
    const focusRows = []
    await context.route('**/*.supabase.co/**', (route) => {
      const request = route.request()
      if (['POST', 'PATCH', 'DELETE'].includes(request.method())) writes.push({ method: request.method(), url: request.url(), data: request.postDataJSON() })
      if (request.url().includes('/rest/v1/focus_timers')) {
        const url = new URL(request.url())
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const userId = url.searchParams.get('user_id')?.replace('eq.', '')
        if (request.method() === 'POST') focusRows.push(...[request.postDataJSON()].flat())
        if (request.method() === 'PATCH') Object.assign(focusRows.find((row) => row.id === id) ?? {}, request.postDataJSON())
        if (request.method() === 'DELETE') focusRows.splice(0, focusRows.length, ...focusRows.filter((row) => row.id !== id))
        const body = request.method() === 'GET' ? focusRows.filter((row) => !userId || row.user_id === userId) : []
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
      }
      const table = Object.keys(responses).find((name) => request.url().includes(`/rest/v1/${name}`))
      const body = request.url().includes('/scheduled_notifications') && request.method() === 'POST' ? { id: `scheduled-${writes.length}` } : table ? responses[table] : []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })
    await context.addInitScript(() => {
      if (!sessionStorage.getItem('focus-fixture-installed')) {
        localStorage.setItem('taskez-pomodoro', JSON.stringify({ version: 0, state: { timers: { pomodoro: { secondsLeft: 1500, running: false, endAt: null }, break: { secondsLeft: 300, running: false, endAt: null } } } }))
        sessionStorage.setItem('focus-fixture-installed', 'true')
      }
      window.focusAudioElements = []
      const OriginalAudio = window.Audio
      window.Audio = function (...args) {
        const element = new OriginalAudio(...args)
        window.focusAudioElements.push(element)
        return element
      }
      window.Audio.prototype = OriginalAudio.prototype
    })
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    async function mount(size = 'M') {
      const modules = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource')
        return Object.fromEntries(['dataStore', 'pomodoroStore', 'authStore'].map((name) => [name, resources.find((entry) => entry.name.includes(`/src/store/${name}.ts`))?.name ?? `/src/store/${name}.ts`]))
      })
      await page.waitForFunction(async (source) => (await import(source)).useDataStore.getState().workspaces.length > 0, modules.dataStore)
      await page.evaluate(async ({ size, modules }) => {
        window.focusStore = (await import(modules.pomodoroStore)).usePomodoroStore
        window.focusAuth = (await import(modules.authStore)).useAuthStore
        const store = (await import(modules.dataStore)).useDataStore
        const layout = { widgets: [{ id: 'focus-test', type: 'utility', size, visible: true, order: 0 }] }
        store.setState({ layouts: { 'workspace-1': { desktop: layout, mobile: layout } } })
      }, { size, modules })
      if (size !== 'S') await page.locator('[data-focus-panel]').waitFor()
    }
    async function create(name, minutes) {
      await page.getByRole('button', { name: 'Adicionar timer', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Novo timer' })
      await dialog.getByLabel('Nome do timer').fill(name)
      await dialog.getByLabel('Duração em minutos').fill(String(minutes))
      await dialog.getByRole('button', { name: 'Adicionar timer', exact: true }).click()
      await dialog.waitFor({ state: 'detached' })
      await page.getByRole('button', { name: `Iniciar ${name}`, exact: true }).waitFor()
    }
    await page.goto(`${base}/dashboard`)
    await mount()
    assert.equal(await page.locator('[data-focus-timer]').count(), 0, 'legacy fixed timers must migrate to an empty list')
    await create('Estudo', 3)
    await page.getByRole('button', { name: 'Editar Estudo', exact: true }).click()
    await page.getByLabel('Duração em minutos').fill('0')
    assert.equal(await page.getByLabel('Duração em minutos').evaluate((el) => el.checkValidity()), false)
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'detached' })

    await page.getByRole('checkbox', { name: 'Música lo-fi' }).check()
    await page.getByLabel('Faixa lo-fi').selectOption('terminal-rain')
    await page.getByRole('button', { name: 'Iniciar Estudo', exact: true }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing' && !window.focusAudioElements[0].paused)
    assert.equal(await page.evaluate(() => window.focusAudioElements.length), 1)
    await page.evaluate(() => { const audio = window.focusAudioElements[0]; audio.currentTime = audio.duration - 0.1 })
    await page.waitForFunction(() => window.focusStore.getState().trackId === '2-am-debug-loop' && window.focusStore.getState().musicStatus === 'playing')
    await page.getByLabel('Volume da música').focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(() => window.focusAudioElements[0].volume === 0.01)
    await page.getByRole('button', { name: 'Pausar Estudo', exact: true }).click()
    await page.waitForFunction(() => window.focusAudioElements[0].paused)
    const pausedAt = await page.evaluate(() => Object.values(window.focusStore.getState().timers)[0].secondsLeft)
    await page.getByRole('button', { name: 'Iniciar Estudo', exact: true }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    assert.ok(await page.evaluate(() => Object.values(window.focusStore.getState().timers)[0].secondsLeft) <= pausedAt)
    await page.getByRole('link', { name: 'Calendário', exact: true }).click()
    await page.getByRole('heading', { name: 'Calendário', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.focusAudioElements[0].paused), false, 'music continues while widget is unmounted')
    await page.getByRole('link', { name: 'Início', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar Estudo', exact: true }).waitFor()

    await page.getByRole('button', { name: 'Editar Estudo', exact: true }).click()
    await page.getByLabel('Nome do timer').fill('Leitura')
    await page.getByRole('button', { name: 'Salvar timer' }).click()
    await page.getByRole('button', { name: 'Pausar Leitura', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Editar Leitura', exact: true }).click()
    await page.getByLabel('Duração em minutos').fill('2')
    await page.getByRole('button', { name: 'Salvar timer' }).click()
    await page.getByRole('button', { name: 'Iniciar Leitura', exact: true }).waitFor()
    assert.equal(await page.getByRole('timer').innerText(), '02:00')
    await page.waitForFunction(() => window.focusAudioElements[0].paused)
    await create('Pausa livre', 1)
    await page.getByRole('button', { name: 'Iniciar Leitura', exact: true }).click()
    await page.getByRole('button', { name: 'Iniciar Pausa livre', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar Leitura', exact: true }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    assert.equal(await page.evaluate(() => window.focusAudioElements[0].paused), false, 'a second running timer keeps the music playing')

    const unavailable = '**/audio/lofi/coffee-ring-notebook.mp3'
    await page.route(unavailable, (route) => route.fulfill({ status: 404, body: '' }))
    await page.getByLabel('Faixa lo-fi').selectOption('coffee-ring-notebook')
    await page.getByRole('button', { name: 'Tentar tocar novamente' }).waitFor()
    await page.unroute(unavailable)
    await page.getByRole('button', { name: 'Tentar tocar novamente' }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    await page.getByRole('button', { name: 'Próxima música' }).click()
    await page.waitForFunction(() => window.focusStore.getState().trackId === 'chapter-by-lamplight' && window.focusStore.getState().musicStatus === 'playing')

    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('[data-screen-panel]').scrollTo(0, 0) })
    await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/taskez-focus-${viewport.width}.png`, fullPage: true })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/taskez-focus-light-${viewport.width}.png`, fullPage: true })

    await page.evaluate(() => {
      const state = window.focusStore.getState()
      const definition = state.definitions.find((timer) => timer.name === 'Pausa livre')
      window.focusStore.setState({ timers: { ...state.timers, [definition.id]: { ...state.timers[definition.id], endAt: Date.now() - 1000 } } })
    })
    await page.getByText('Concluído', { exact: true }).waitFor()
    await page.waitForFunction(() => window.focusAudioElements[0].paused)
    assert.ok(writes.some((w) => w.data?.title === 'Pausa livre: tempo concluído!'))
    assert.ok(writes.some((w) => w.method === 'DELETE' && w.url.includes('scheduled_notifications')))
    await page.getByRole('button', { name: 'Iniciar Pausa livre', exact: true }).click()
    await page.waitForFunction(() => window.focusStore.getState().musicStatus === 'playing')
    await page.getByRole('button', { name: 'Editar Pausa livre', exact: true }).click()
    await page.getByRole('button', { name: 'Excluir timer', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await page.getByRole('button', { name: 'Editar Pausa livre', exact: true }).waitFor({ state: 'detached' })
    await page.waitForFunction(() => window.focusAudioElements[0].paused)

    const limits = await page.evaluate(() => {
      const store = window.focusStore.getState()
      const invalid = [store.addTimer('', 1), store.addTimer('Inválido', 0), store.addTimer('Inválido', 1.5), store.addTimer('Inválido', 1441)]
      for (let i = 0; i < 9; i++) store.addTimer(`Timer ${i + 1}`, i + 1)
      return { invalid, extra: store.addTimer('Décimo primeiro', 5), total: window.focusStore.getState().definitions.length }
    })
    assert.deepEqual(limits, { invalid: [false, false, false, false], extra: false, total: 10 })
    assert.equal(await page.getByRole('button', { name: 'Limite de 10 timers atingido' }).isDisabled(), true)
    await page.evaluate(() => {
      const state = window.focusStore.getState()
      for (const timer of state.definitions.slice(1)) state.removeTimer(timer.id)
      state.setMusicEnabled(false)
      state.start(state.definitions[0].id)
      window.expectedEndAt = window.focusStore.getState().timers[state.definitions[0].id].endAt
      sessionStorage.setItem('expectedEndAt', String(window.expectedEndAt))
    })
    await page.reload()
    await mount()
    assert.equal(await page.evaluate(() => Object.values(window.focusStore.getState().timers)[0].endAt), Number(await page.evaluate(() => sessionStorage.getItem('expectedEndAt'))))
    await page.getByRole('button', { name: 'Pausar Leitura', exact: true }).waitFor()
    await page.evaluate(() => window.focusAuth.setState({ currentUserId: 'other-user' }))
    await page.getByText('Crie seu primeiro timer e dê um ritmo ao seu foco.').waitFor()
    assert.equal(await page.evaluate(() => Object.values(window.focusStore.getState().timers).some((timer) => timer.running)), false)
    assert.equal(await page.evaluate(() => window.focusStore.getState().addTimer('Timer da outra conta', 5)), true)
    await page.evaluate(() => window.focusAuth.setState({ currentUserId: 'test-user' }))
    await page.getByRole('button', { name: 'Iniciar Leitura', exact: true }).waitFor()
    assert.equal(await page.getByText('Timer da outra conta', { exact: true }).count(), 0)
    await page.evaluate(() => {
      const store = window.focusStore.getState()
      const definition = store.definitions.find((timer) => timer.name === 'Leitura')
      store.start(definition.id)
      navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'pomodoro-action', action: 'stop', id: definition.id } }))
    })
    await page.waitForFunction(() => {
      const state = window.focusStore.getState()
      const definition = state.definitions.find((timer) => timer.name === 'Leitura')
      return state.timers[definition.id].secondsLeft === 120 && !state.timers[definition.id].running
    })
    await mount('S')
    await page.getByRole('button', { name: 'Meus timers', exact: true }).click()
    await page.getByRole('button', { name: 'Editar Leitura', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Editar Leitura', exact: true }).click()
    await page.getByRole('dialog', { name: 'Editar timer' }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual(errors, [])
    console.log(`PASS ${viewport.width}x${viewport.height}: migration, editable timers, limits, persistence, account isolation, real MP3 playback, automatic playlist advance, pause/resume, volume, completion, error recovery, navigation, and compact widget`)
    await context.close()
  }
} finally {
  await browser.close()
}

