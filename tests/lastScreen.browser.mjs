// Run against Vite with PLAYWRIGHT_MODULE pointing to an installed playwright package.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
const browser = await chromium.launch({ channel: 'msedge', headless: true })

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    // Local fixture: no real authentication or server writes during the test.
    await context.route('**/src/store/authStore.ts', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
        const state = { currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
          hasSeenOnboarding: true, currentUser: () => user };
        export const useAuthStore = (selector) => selector(state);
        useAuthStore.getState = () => state;`,
    }))
    await context.route('**/*.supabase.co/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }))
    await context.addInitScript(() => {
      if (!localStorage.getItem('test-initialized')) {
        localStorage.setItem('taskez:last-screen:test-user', '/files')
        localStorage.setItem('test-initialized', 'true')
      }
      window.savedRoutes = []
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key === 'taskez:last-screen:test-user') window.savedRoutes.push(value)
        return original.call(this, key, value)
      }
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/dashboard`)
    await page.waitForURL('**/files')
    await page.getByRole('heading', { name: 'Arquivos', exact: true }).waitFor()
    if (viewport.width >= 1024) await page.getByText('Meu workspace', { exact: true }).waitFor()
    assert.ok(!(await page.evaluate(() => window.savedRoutes)).includes('/dashboard'))

    // During the slide, the exiting screen must retain its own content while
    // the new screen enters. A live <Outlet /> used to turn both into Tarefas.
    await page.getByRole('link', { name: 'Tarefas', exact: true }).click()
    await page.getByRole('heading', { name: 'Tarefas', exact: true }).waitFor({ state: 'attached' })
    const headingsDuringSlide = await page.locator('h1').allTextContents()
    assert.ok(headingsDuringSlide.includes('Arquivos'))
    assert.ok(headingsDuringSlide.includes('Tarefas'))
    const slideOffset = await page.locator('[data-screen-panel]').last().evaluate((panel) => {
      const matrix = new DOMMatrix(getComputedStyle(panel).transform)
      return { x: Math.abs(matrix.m41), y: Math.abs(matrix.m42) }
    })
    if (viewport.width >= 1024) {
      assert.ok(slideOffset.y > 1 && slideOffset.x < 1, `expected vertical desktop slide: ${JSON.stringify(slideOffset)}`)
    } else {
      assert.ok(slideOffset.x > 1 && slideOffset.y < 1, `expected horizontal mobile slide: ${JSON.stringify(slideOffset)}`)
    }
    await page.getByRole('heading', { name: 'Arquivos', exact: true }).waitFor({ state: 'detached' })

    // A navigation during the session must still be allowed to open the dashboard.
    await page.getByRole('link', { name: 'Início', exact: true }).click()
    await page.waitForFunction(() => localStorage.getItem('taskez:last-screen:test-user') === '/dashboard')

    await page.goto(`${base}/tasks`)
    await page.getByRole('heading', { name: 'Tarefas', exact: true }).waitFor()
    await page.waitForFunction(() => localStorage.getItem('taskez:last-screen:test-user') === '/tasks')
    await page.close()
    const reopened = await context.newPage()
    await reopened.goto(`${base}/dashboard`)
    await reopened.waitForURL('**/tasks')
    await reopened.getByRole('heading', { name: 'Tarefas', exact: true }).waitFor()
    assert.ok(!(await reopened.evaluate(() => window.savedRoutes)).includes('/dashboard'))
    assert.deepEqual(errors, [])
    console.log(`PASS ${viewport.width}px: legacy launch, no dashboard overwrite, navigation, close/reopen`)
    await context.close()
  }
} finally {
  await browser.close()
}
