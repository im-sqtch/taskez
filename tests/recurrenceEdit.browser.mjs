// Editar tarefa recorrente: "só esta" guarda o modelo dos próximos ciclos na
// regra; "esta e as próximas" aplica na série e descarta o modelo.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
// PLAYWRIGHT_CHANNEL vazio usa o Chromium do próprio Playwright (padrão: Edge).
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })

const createdAt = '2026-11-20T12:00:00.000Z'
const row = {
  id: 'task-1', workspace_id: 'workspace-1', project_id: null, title: 'Ler Escrituras', description: null, status: 'todo', not_fulfilled: false,
  priority: 'medium', due_date: '2026-11-20T00:00:00.000Z', due_time: '07:00', duration_minutes: 30, reminder_minutes: 0,
  assignee_ids: [], subtasks: [], comments: [], links: [], created_at: createdAt, updated_at: createdAt, completed_at: null, order: 0,
  recurrence: { frequency: 'daily' }, series_id: 'task-1', deleted_at: null, deleted_by: null,
}
const responses = {
  workspace_members: [{ workspace_id: 'workspace-1', role: 'owner', workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', default_assignee_id: null, created_by: 'test-user', created_at: createdAt } }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Teste', role: 'Organizador', avatar_color: '#123456', status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
  tasks: [row],
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Sao_Paulo' })
  await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
      const state = { currentUserId: user.id, profile: user, authReady: true, hasHydrated: true, hasSeenOnboarding: true, currentUser: () => user };
      export const useAuthStore = (selector) => selector(state);
      useAuthStore.getState = () => state;`,
  }))
  const patches = []
  await context.route('**/*.supabase.co/**', (route) => {
    const request = route.request()
    if (request.method() === 'PATCH' && request.url().includes('/rest/v1/tasks')) patches.push(request.postDataJSON())
    const table = Object.keys(responses).find((name) => request.url().includes(`/rest/v1/${name}`))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table ? responses[table] : []) })
  })
  const page = await context.newPage()
  // Dia do próprio ciclo: nenhum ciclo novo é gerado durante o teste.
  await page.clock.setFixedTime(new Date('2026-11-20T15:00:00.000Z'))
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  async function editTitle(title) {
    await page.getByRole('button', { name: 'Editar tarefa' }).click()
    const input = page.getByPlaceholder('Ex: Enviar proposta para o cliente')
    await input.fill(title)
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
    await page.getByRole('dialog', { name: 'Editar tarefa recorrente' }).waitFor()
  }

  await page.goto(`${base}/tasks/task-1`)
  await page.locator('h1').filter({ hasText: /^Ler Escrituras/ }).waitFor()

  await editTitle('Ler Escrituras (só hoje)')
  await page.getByRole('button', { name: /Só esta tarefa/ }).click()
  await page.locator('h1').filter({ hasText: /^Ler Escrituras \(só hoje\)/ }).waitFor()
  const onlyThis = patches.at(-1)
  assert.equal(onlyThis.title, 'Ler Escrituras (só hoje)')
  assert.equal(onlyThis.recurrence.frequency, 'daily')
  assert.equal(onlyThis.recurrence.template.title, 'Ler Escrituras', 'o modelo guarda o título anterior')
  assert.equal(onlyThis.recurrence.template.dueTime, '07:00')
  console.log('PASS só esta: edição na ocorrência atual e modelo dos próximos ciclos preservado')

  await editTitle('Ler Escrituras pela manhã')
  await page.getByRole('button', { name: /Esta e as próximas/ }).click()
  await page.locator('h1').filter({ hasText: /^Ler Escrituras pela manhã/ }).waitFor()
  const all = patches.at(-1)
  assert.equal(all.title, 'Ler Escrituras pela manhã')
  assert.equal(all.recurrence.template, undefined, 'esta e as próximas descarta o modelo')
  console.log('PASS esta e as próximas: edição vale para a série')

  assert.deepEqual(errors, [])
  await context.close()
} finally {
  await browser.close()
}
