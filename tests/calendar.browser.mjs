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

responses.tasks.push(
  { ...responses.tasks[0], id: 'task-done', title: 'Entrega concluída', status: 'done' },
  { ...responses.tasks[0], id: 'task-undated', title: 'Planejar próxima entrega', project_id: null, due_date: null },
  { ...responses.tasks[0], id: 'task-other', title: 'Outra workspace', workspace_id: 'workspace-2' },
)

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }, { width: 812, height: 375 }]) {
    const context = await browser.newContext({ viewport, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' })
    await context.route('**/src/store/authStore.ts', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
        const state = { currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
          hasSeenOnboarding: true, currentUser: () => user };
        export const useAuthStore = (selector) => selector(state);
        useAuthStore.getState = () => state;`,
    }))
    const writes = []
    await context.route('**/*.supabase.co/**', (route) => {
      const request = route.request()
      if (['POST', 'PATCH'].includes(request.method())) writes.push({ url: request.url(), data: request.postDataJSON() })
      const table = Object.keys(responses).find((name) => request.url().includes(`/rest/v1/${name}`))
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table ? responses[table] : []) })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/calendar?date=2026-11-26&view=month`)
    await page.getByRole('heading', { name: 'Calendário', exact: true }).waitFor()
    assert.equal(await page.locator('[data-calendar-day]').count(), 42)
    assert.equal(await page.locator('[data-calendar-day="2026-11-26"]').getByRole('link', { name: 'Tarefa teste', exact: true }).count(), 1, 'UTC deadline must stay on the selected Brazilian day')
    assert.equal(await page.getByText('Outra workspace', { exact: true }).count(), 0)
    const visibleNav = viewport.width >= 1024 ? page.locator('aside').first() : page.locator('nav').last()
    assert.equal(await visibleNav.getByRole('link', { name: 'Calendário', exact: true }).count(), 1)
    assert.equal(await visibleNav.getByRole('link', { name: 'Tarefas', exact: true }).count(), viewport.width >= 1024 ? 1 : 0)
    if (viewport.width >= 1024) {
      const labels = await visibleNav.getByRole('link').allTextContents()
      assert.equal(labels.indexOf('Calendário'), labels.indexOf('Tarefas') + 1)
    }
    await page.locator('[data-calendar-day="2026-11-26"]').getByRole('link', { name: 'Tarefa teste', exact: true }).click()
    await page.getByRole('heading', { name: 'Tarefa teste', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Voltar ao calendário', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/calendar')
    await page.locator('.calendar-detail').waitFor({ state: 'detached' })
    assert.match(page.url(), /date=2026-11-26&view=month/)
    for (const view of ['day', 'week', 'agenda', 'month']) {
      await page.getByLabel('Visualização do calendário').selectOption(view)
      await page.waitForURL((url) => url.searchParams.get('view') === view)
      await page.waitForFunction((v) => document.querySelector('#calendar-view')?.value === v, view)
      assert.ok(await page.getByText('Tarefa teste', { exact: true }).count() > 0)
    }
    await page.getByRole('button', { name: 'Filtros do calendário' }).click()
    await page.getByLabel('Mostrar concluídas').click()
    await page.waitForURL((url) => url.searchParams.get('completed') === 'false')
    await page.getByText('Entrega concluída', { exact: true }).first().waitFor({ state: 'detached' })
    assert.equal(await page.getByText('Entrega concluída', { exact: true }).count(), 0)
    await page.getByLabel('Projeto teste', { exact: true }).click()
    await page.waitForURL((url) => url.searchParams.getAll('hide').includes('project-1'))
    await page.getByText('Tarefa teste', { exact: true }).first().waitFor({ state: 'detached' })
    assert.equal(await page.getByText('Tarefa teste', { exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await page.waitForURL((url) => !url.searchParams.has('hide') && !url.searchParams.has('completed'))
    await page.getByText('Tarefa teste', { exact: true }).first().waitFor()
    await page.getByLabel('Pesquisar no calendário').fill('inexistente')
    await page.getByText('Tarefa teste', { exact: true }).first().waitFor({ state: 'detached' })
    assert.equal(await page.getByText('Tarefa teste', { exact: true }).count(), 0)
    await page.getByLabel('Pesquisar no calendário').fill('')
    await page.getByRole('button', { name: 'Sem data (1)' }).click()
    await page.getByText('Planejar próxima entrega', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Voltar ao calendário', exact: true }).click()
    await page.waitForURL((url) => !url.searchParams.has('undated'))
    await page.getByRole('heading', { name: 'Novembro de 2026', exact: true }).waitFor()
    await page.getByLabel('Ir para uma data').fill('2026-01-31')
    await page.waitForURL((url) => url.searchParams.get('date') === '2026-01-31')
    await page.getByRole('heading', { name: 'Janeiro de 2026', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Próximo período', exact: true }).click()
    await page.waitForURL((url) => url.searchParams.get('date') === '2026-02-01')
    await page.getByRole('heading', { name: 'Fevereiro de 2026', exact: true }).waitFor()
    assert.match(page.url(), /date=2026-02-01/)
    await page.getByLabel('Ir para uma data').fill('2026-11-26')
    await page.waitForURL((url) => url.searchParams.get('date') === '2026-11-26')
    await page.getByRole('heading', { name: 'Novembro de 2026', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
    await page.getByPlaceholder('Ex: Enviar proposta para o cliente').fill('Criada pelo calendário')
    await page.getByRole('button', { name: '26 de nov', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
    await page.waitForFunction(() => document.body.textContent.includes('Criada pelo calendário'))
    assert.ok(writes.some((w) => w.url.includes('/tasks') && w.data.title === 'Criada pelo calendário' && w.data.due_date === '2026-11-26T00:00:00.000Z'))
    await page.getByRole('button', { name: 'Filtros do calendário' }).click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (viewport.width === 1440 || viewport.width === 375) {
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('[data-screen-panel]').scrollTo(0, 0) })
      await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/taskez-calendar-${viewport.width}.png`, fullPage: true })
      await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light') })
      await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/taskez-calendar-light-${viewport.width}.png`, fullPage: true })
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${viewport.width}x${viewport.height}: navigation, views, dates, details, filters, undated tasks, creation, persistence, workspace isolation, and overflow`)
    await context.close()
  }
} finally {
  await browser.close()
}

