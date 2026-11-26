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
  tasks: [{ id: 'task-1', workspace_id: 'workspace-1', project_id: 'project-1', title: 'Tarefa teste', description: null, status: 'todo', not_fulfilled: false, priority: 'medium', due_date: null, assignee_ids: [], subtasks: [], comments: [], links: [], created_at: createdAt, updated_at: createdAt, completed_at: null, order: 0, recurrence: null, series_id: null, deleted_at: null, deleted_by: null }],
  chat_messages: [{ id: 'message-1', workspace_id: 'workspace-1', project_id: 'project-1', author_id: 'test-user', text: 'Mensagem', created_at: createdAt }],
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Sao_Paulo' })
  await context.route('**/src/store/authStore.ts', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
      const state = { currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
        hasSeenOnboarding: true, currentUser: () => user };
      export const useAuthStore = (selector) => selector(state);
      useAuthStore.getState = () => state;`,
  }))
  await context.route('**/*.supabase.co/**', (route) => {
    const url = route.request().url()
    const table = Object.keys(responses).find((name) => url.includes(`/rest/v1/${name}`))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table ? responses[table] : []) })
  })

  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00Z'))
  await page.goto(`${base}/dashboard`)
  const widget = page.getByRole('region', { name: 'Progresso da semana', exact: true })
  await widget.waitFor()
  const labels = ['Porcentagem de conclusão', 'Totais, em andamento e consecutivos', 'Pendências da semana', 'Histórico de conclusão']
  const calculated = await page.evaluate(async () => {
    const { computeStats } = await import('/src/lib/stats.ts')
    const store = (await import('/src/store/dataStore.ts')).useDataStore
    const template = store.getState().tasks[0]
    const tasks = [
      ['2026-11-15', 'todo'], ['2026-11-16', 'in_progress'], ['2026-11-20', 'done'],
      ['2026-11-22', 'todo'], ['2026-11-14', 'todo'], [undefined, 'todo'],
    ].map(([due, status], i) => ({ ...template, id: `stat-${i}`, dueDate: due && `${due}T00:00:00Z`, status }))
    store.setState({ tasks })
    return computeStats(tasks)
  })
  assert.equal(calculated.pendingThisWeek, 2, 'only open tasks due in this week')
  assert.equal(calculated.overdueThisWeek, 1, 'today is still within deadline')
  assert.equal(calculated.weekProgress, 33, 'next week, previous week and undated tasks excluded')
  console.log('PASS weekly metrics: pending and overdue counts respect local dates and week boundaries')
  const next = widget.getByRole('button', { name: 'Próximos dados' })
  const previous = widget.getByRole('button', { name: 'Dados anteriores' })
  async function setSize(size) {
    await page.evaluate(async (size) => {
      const store = (await import('/src/store/dataStore.ts')).useDataStore
      store.getState().setLayout({ widgets: [{ id: 'summary', type: 'summary', size, visible: true, order: 0 }] })
    }, size)
  }
  async function expectBlocks(expected) {
    assert.deepEqual(await widget.getByRole('group').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))), expected)
    const darkText = await widget.locator('p, span, button, svg').evaluateAll((elements) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')
      return elements.filter((el) => {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = getComputedStyle(el).color
        ctx.fillRect(0, 0, 1, 1)
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
        return Math.min(r, g, b) < 245
      }).map((el) => ({ text: el.textContent, color: getComputedStyle(el).color }))
    })
    assert.deepEqual(darkText, [], 'all widget text and icons must stay white over the purple background')
  }
  async function expectHeaderPagination(text) {
    const status = widget.getByRole('status')
    assert.equal(await status.innerText(), text)
    const counter = await status.boundingBox()
    const title = await widget.getByText('Progresso da semana', { exact: true }).boundingBox()
    assert.ok(Math.abs(counter.y + counter.height / 2 - title.y - title.height / 2) < 1)
    assert.ok(counter.x > title.x)
  }
  for (const width of [1440]) {
    await page.setViewportSize({ width, height: 900 })
    await setSize('S')
    await expectHeaderPagination('1 de 4')
    console.log('S height', (await widget.boundingBox()).height)
    assert.ok((await widget.boundingBox()).height <= 145, 'small widget stays compact')
    for (let i = 0; i < 4; i++) {
      await expectBlocks([labels[i]])
      await next.click()
    }
    await expectBlocks([labels[0]])
    await previous.click()
    await expectBlocks([labels[3]])
    await setSize('M')
    await previous.click() // normalize to first of two pages
    await expectHeaderPagination('1 de 2')
    console.log('M height', (await widget.boundingBox()).height)
    assert.ok((await widget.boundingBox()).height <= 220, 'medium widget stays compact')
    await expectBlocks(labels.slice(0, 2))
    await next.click()
    await expectBlocks(labels.slice(2))
    await widget.getByText('1 atrasadas · 1 dentro do prazo', { exact: true }).waitFor()
    assert.equal(await widget.getByText('Eficiência Semanal', { exact: true }).count(), 0)
    await expectHeaderPagination('2 de 2')
    await next.click()
    await expectBlocks(labels.slice(0, 2))
    assert.equal(await widget.getByText('para hoje', { exact: true }).count(), 0)
    assert.equal(await widget.getByText('atrasadas', { exact: true }).count(), 0)
    await setSize('L')
    await expectBlocks(labels)
    assert.equal(await next.count(), 0)
    await setSize('LH')
    await expectBlocks(labels)
    console.log(`PASS ${width}px: compact S/M, new pending indicator, M cycles pairs, L/LH show all four`)
  }
  await page.setViewportSize({ width: 390, height: 900 })
  const cdp = await context.newCDPSession(page)
  async function swipe(dx, dy = 0) {
    const area = await widget.locator('.touch-pan-y').boundingBox()
    const x = area.x + area.width / 2
    const y = area.y + area.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  for (const size of ['S', 'M']) {
    await setSize(size)
    assert.ok((await widget.boundingBox()).height <= (size === 'S' ? 130 : 205), 'mobile widget stays compact')
    assert.equal(await next.isVisible(), false)
    assert.equal(await previous.isVisible(), false)
    await expectHeaderPagination(size === 'S' ? '1 de 4' : '1 de 2')
    const first = size === 'S' ? labels.slice(0, 1) : labels.slice(0, 2)
    const second = size === 'S' ? labels.slice(1, 2) : labels.slice(2)
    await expectBlocks(first)
    await swipe(-90)
    await expectBlocks(second)
    if (size === 'M') {
      await page.waitForFunction(() => {
        const track = document.querySelector('[aria-label="Progresso da semana"] .transition-transform')
        return Math.abs(new DOMMatrixReadOnly(getComputedStyle(track).transform).m41 + track.getBoundingClientRect().width) < 1
      })
      await page.screenshot({ path: `${process.env.TEMP}/taskez-summary-compact.png` })
    }
    await expectHeaderPagination(size === 'S' ? '2 de 4' : '2 de 2')
    await swipe(90)
    await expectBlocks(first)
    await swipe(5, -80)
    await expectBlocks(first)
    console.log(`PASS mobile ${size}: arrows hidden, pagination aligned with title; swipes in both directions, vertical gesture preserves page`)
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(async (theme) => (await import('/src/store/themeStore.ts')).useThemeStore.getState().setTheme(theme), theme)
    await page.waitForFunction((theme) => document.documentElement.dataset.theme === theme, theme)
    for (const size of ['S', 'M', 'L', 'LH']) {
      await setSize(size)
      await expectBlocks(size === 'S' ? labels.slice(0, 1) : size === 'M' ? labels.slice(0, 2) : labels)
    }
    console.log(`PASS ${theme}: white text and icons in all widget sizes`)
  }
  await context.close()
} finally {
  await browser.close()
}
