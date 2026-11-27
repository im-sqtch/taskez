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
  tasks: [{ id: 'task-1', workspace_id: 'workspace-1', project_id: 'project-1', title: 'Tarefa teste', description: null, status: 'todo', not_fulfilled: false, priority: 'medium', due_date: null, assignee_ids: [], subtasks: [], comments: [], links: [], created_at: createdAt, updated_at: createdAt, completed_at: null, order: 0, recurrence: null, series_id: null, deleted_at: null, deleted_by: null }],
  chat_messages: [{ id: 'message-1', workspace_id: 'workspace-1', project_id: 'project-1', author_id: 'test-user', text: 'Mensagem', created_at: createdAt }],
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
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
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  function extendContent() {
    const headers = [...document.querySelectorAll('header')]
    for (const header of headers) {
      let sticky = header
      while (sticky && getComputedStyle(sticky).position !== 'sticky') sticky = sticky.parentElement
      if (!sticky) throw new Error('Sticky header missing')
      const filler = document.createElement('div')
      filler.style.minHeight = '1800px'
      sticky.parentElement.appendChild(filler)
    }
  }
  for (const path of ['/dashboard', '/files', '/profile', '/settings']) {
    await page.goto(`${base}${path}?test=scroll`)
    const header = page.locator('header').first()
    await header.waitFor()
    await page.evaluate(extendContent)
    const before = await header.boundingBox()
    const scroller = page.locator('[data-screen-panel]')
    await scroller.evaluate((el) => { el.scrollTop = 500 })
    const after = await header.boundingBox()
    assert.ok(Math.abs(before.y - after.y) < 1, `${path}: header moved`)
    assert.equal(await page.evaluate(() => window.scrollY), 0)
    assert.equal(await scroller.evaluate((el) => el.scrollTop), 500)
    console.log(`PASS desktop ${path}: pinned heading, content scrolls within viewport`)
  }
  for (const section of ['projects', 'tasks']) {
    await page.goto(`${base}/${section}/${section === 'projects' ? 'project-1' : 'task-1'}`)
    const list = page.locator(`[data-scroll-pane="${section}-list"]`)
    const detail = page.locator(`[data-scroll-pane="${section}-detail"]`)
    await detail.locator('header').waitFor()
    await page.evaluate(extendContent)
    const leftHeader = list.locator('header')
    const rightHeader = detail.locator('header')
    const detailHeading = detail.locator('[data-detail-heading]')
    const title = detailHeading.getByRole('heading', { level: 1 })
    const filters = list.getByRole('button', { name: section === 'projects' ? 'Ativos' : 'Todas', exact: true })
    const before = [await leftHeader.boundingBox(), await rightHeader.boundingBox(), await filters.boundingBox(), await detailHeading.boundingBox(), await title.boundingBox()]
    const tabsBefore = section === 'projects' ? await detailHeading.getByRole('button', { name: 'Tarefas', exact: true }).boundingBox() : null
    await list.evaluate((el) => { el.scrollTop = 350 })
    assert.equal(await detail.evaluate((el) => el.scrollTop), 0)
    await detail.evaluate((el) => { el.scrollTop = 500 })
    assert.equal(await list.evaluate((el) => el.scrollTop), 350)
    assert.equal(await detail.evaluate((el) => el.scrollTop), 500)
    const after = [await leftHeader.boundingBox(), await rightHeader.boundingBox(), await filters.boundingBox(), await detailHeading.boundingBox(), await title.boundingBox()]
    for (let i = 0; i < before.length; i++) assert.ok(Math.abs(before[i].y - after[i].y) < 1, `${section}: heading/filter ${i} moved`)
    if (tabsBefore) {
      const tabsAfter = await detailHeading.getByRole('button', { name: 'Tarefas', exact: true }).boundingBox()
      assert.ok(Math.abs(tabsBefore.y - tabsAfter.y) < 1, 'project tabs must stay pinned')
    }
    assert.equal(await page.evaluate(() => window.scrollY), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await filters.click()
    console.log(`PASS desktop ${section}: independent list/detail scroll, both headers and list filters stay pinned`)
  }
  await page.setViewportSize({ width: 390, height: 800 })
  for (const path of ['/dashboard', '/projects', '/tasks', '/files', '/profile', '/settings']) {
    await page.goto(`${base}${path}?test=scroll`)
    const header = page.locator('header').first()
    await header.waitFor()
    await page.evaluate(extendContent)
    const before = await header.boundingBox()
    await page.evaluate(() => window.scrollTo(0, 400))
    const after = await header.boundingBox()
    assert.equal(await page.evaluate(() => window.scrollY), 400)
    assert.ok(Math.abs(before.y - after.y) < 1, `${path}: mobile heading moved`)
    console.log(`PASS mobile ${path}: document scroll and pinned heading preserved`)
  }
  for (const path of ['/projects/project-1', '/tasks/task-1', '/projects/project-1/tasks/task-1']) {
    await page.goto(`${base}${path}?test=scroll`)
    const heading = page.locator('[data-detail-heading]')
    await heading.waitFor()
    await heading.evaluate((el) => {
      const filler = document.createElement('div')
      filler.style.minHeight = '1800px'
      el.parentElement.appendChild(filler)
    })
    const before = [await heading.boundingBox(), await heading.getByRole('heading', { level: 1 }).boundingBox()]
    await page.evaluate(() => window.scrollTo(0, 450))
    assert.equal(await page.evaluate(() => window.scrollY), 450)
    const after = [await heading.boundingBox(), await heading.getByRole('heading', { level: 1 }).boundingBox()]
    for (let i = 0; i < before.length; i++) assert.ok(Math.abs(before[i].y - after[i].y) < 1, `${path}: detail heading moved`)
    console.log(`PASS mobile ${path}: complete detail heading stays pinned`)
  }
  assert.deepEqual(errors, [])
  await context.close()
} finally {
  await browser.close()
}
