// Fila de pendências: sem conexão, as alterações ficam guardadas e são
// reenviadas (na ordem) quando a rede volta; erro do banco não é repetido.
// Run against Vite with PLAYWRIGHT_MODULE pointing to an installed playwright package.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
// PLAYWRIGHT_CHANNEL vazio usa o Chromium do próprio Playwright (padrão: Edge).
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })

const createdAt = '2026-09-26T12:00:00.000Z'
const task = (id, title) => ({ id, workspace_id: 'workspace-1', project_id: null, title, description: null, status: 'todo', not_fulfilled: false, priority: 'medium', due_date: null, due_time: null, assignee_ids: [], subtasks: [], comments: [], links: [], created_at: createdAt, updated_at: createdAt, completed_at: null, order: 0, recurrence: null, series_id: null, deleted_at: null, deleted_by: null })
const responses = {
  workspace_members: [{ workspace_id: 'workspace-1', role: 'owner', workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', default_assignee_id: null, created_by: 'test-user', created_at: createdAt } }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Teste', role: 'Organizador', avatar_color: '#123456', status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
  tasks: [task('task-1', 'Primeira tarefa'), task('task-2', 'Segunda tarefa')],
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' })
  await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `import { create } from '/node_modules/.vite/deps/zustand.js';
      const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
      export const useAuthStore = create((set, get) => ({ currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
        hasSeenOnboarding: true, currentUser: () => get().profile }));`,
  }))
  const writes = []
  let rejectNextPatch = false
  await context.route('**/*.supabase.co/**', (route) => {
    const request = route.request()
    if (request.method() === 'PATCH' && request.url().includes('/rest/v1/tasks')) {
      writes.push({ url: request.url(), data: request.postDataJSON(), auth: request.headers().authorization })
      if (rejectNextPatch) {
        rejectNextPatch = false
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied' }) })
      }
      return route.fulfill({ status: 204, body: '' })
    }
    const table = Object.keys(responses).find((name) => request.url().includes(`/rest/v1/${name}`))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table ? responses[table] : []) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/tasks`)
  await page.getByText('Primeira tarefa', { exact: true }).waitFor()

  // Sem conexão: concluir duas tarefas não envia nada e mostra o aviso.
  await context.setOffline(true)
  await page.getByRole('status').filter({ hasText: 'Sem conexão' }).waitFor()
  // Botão de concluir da linha da tarefa (a lista reordena ao concluir).
  const toggle = (title) => page.getByText(title, { exact: true }).locator('xpath=ancestor::button[1]/..').getByRole('button', { name: 'Alternar conclusão' }).click()
  await toggle('Primeira tarefa')
  await toggle('Segunda tarefa')
  // Concluir também gera uma notificação; por isso há mais de 2 pendências.
  await page.getByText(/^Sem conexão · \d+ alterações serão enviadas quando voltar$/).waitFor()
  assert.equal(writes.length, 0)
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('taskez-pending-writes')))
  assert.equal(queued.filter((item) => item.method === 'PATCH' && item.url.includes('/rest/v1/tasks')).length, 2)

  // Conexão de volta: reenvia na ordem e o aviso some.
  await context.setOffline(false)
  await page.waitForFunction(() => !localStorage.getItem('taskez-pending-writes'))
  await page.getByRole('status').filter({ hasText: /Sem conexão|Enviando/ }).waitFor({ state: 'detached' })
  assert.equal(writes.length, 2)
  assert.ok(writes[0].url.includes('id=eq.task-1') && writes[1].url.includes('id=eq.task-2'), 'reenvio deve manter a ordem')
  assert.ok(writes.every((w) => w.data.status === 'done' && w.auth?.startsWith('Bearer ')))
  console.log('PASS offline: alterações guardadas, aviso exibido e reenvio em ordem ao reconectar')

  // Erro do banco (permissão): não entra na fila nem é repetido.
  rejectNextPatch = true
  await toggle('Primeira tarefa')
  await page.waitForTimeout(500)
  assert.equal(writes.length, 3)
  assert.equal(await page.evaluate(() => localStorage.getItem('taskez-pending-writes')), null)
  console.log('PASS erro do banco: não fica na fila nem é reenviado')

  assert.deepEqual(errors, [])
  await context.close()
} finally {
  await browser.close()
}
