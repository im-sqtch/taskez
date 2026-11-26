// Run against Vite with PLAYWRIGHT_MODULE pointing to an installed playwright package.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const createdAt = '2026-11-16T12:00:00.000Z'
const project = {
  id: 'project-1', workspaceId: 'workspace-1', name: 'Rotina de casa',
  color: '#7c5cff', status: 'active', memberIds: [], links: [], createdAt,
  order: 0, completionAck: false,
}
const task = {
  id: 'task-1', workspaceId: 'workspace-1', projectId: project.id,
  title: 'Ler Escrituras', status: 'todo', priority: 'medium',
  assigneeIds: ['member-1'], subtasks: [], comments: [], links: [],
  createdAt, updatedAt: createdAt, order: 0,
}
const responses = {
  workspace_members: [{
    workspace_id: 'workspace-1', role: 'owner',
    workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', created_by: 'test-user', created_at: createdAt },
  }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Teste', role: 'Organizador', avatar_color: '#123456', status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
  projects: [{
    id: project.id, workspace_id: project.workspaceId, name: project.name,
    color: project.color, status: 'active', member_ids: [], links: [],
    created_at: createdAt, order: 0, completion_ack: false,
  }],
  tasks: [{
    id: task.id, workspace_id: task.workspaceId, project_id: task.projectId,
    title: task.title, status: task.status, priority: task.priority,
    assignee_ids: task.assigneeIds, subtasks: [], comments: [], links: [],
    created_at: createdAt, updated_at: createdAt, order: 0,
  }],
}

try {
  const context = await browser.newContext({ viewport: { width: 465, height: 850 }, timezoneId: 'America/Sao_Paulo' })
  const writes = []
  // All authentication and database access is mocked; no real user data is changed.
  await context.route('**/src/store/authStore.ts', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456' };
      const state = { currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
        hasSeenOnboarding: true, currentUser: () => user };
      export const useAuthStore = (selector) => selector(state);
      useAuthStore.getState = () => state;`,
  }))
  await context.route('**/*.supabase.co/**', (route) => {
    const request = route.request()
    const table = new URL(request.url()).pathname.split('/rest/v1/')[1]?.split('/')[0]
    if (request.method() !== 'GET') writes.push({ table, method: request.method(), body: request.postDataJSON() })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responses[table] || []) })
  })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00.000Z'))
  await page.goto(`${base}/tasks/task-1`)
  await page.getByRole('heading', { name: task.title, exact: true }).waitFor()
  await page.evaluate(async () => {
    window.recurrenceStore = (await import('/src/store/dataStore.ts')).useDataStore
  })

  await page.locator('button:has(svg.lucide-pencil)').click()
  await page.getByRole('button', { name: 'Não repete', exact: true }).click()
  await page.getByRole('button', { name: 'Diariamente', exact: true }).click()
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  const saved = await page.evaluate(() => window.recurrenceStore.getState().tasks.find((t) => t.id === 'task-1'))
  assert.equal(saved.projectId, project.id)
  assert.equal(saved.recurrence.frequency, 'daily')
  await page.waitForFunction(() => !document.querySelector('h2'))
  await page.locator('button:has(svg.lucide-pencil)').click()
  await page.getByRole('button', { name: 'Todo dia', exact: true }).waitFor()
  await page.getByRole('button', { name: project.name, exact: true }).last().click()
  await page.getByRole('button', { name: 'Nenhum', exact: true }).last().click()
  await page.getByRole('heading', { name: 'Projeto', exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Todo dia', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Nenhum', exact: true }).last().click()
  await page.getByRole('button', { name: project.name, exact: true }).last().click()
  await page.getByRole('heading', { name: 'Projeto', exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Todo dia', exact: true }).click()
  await page.getByRole('button', { name: 'Não repetir', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  assert.equal(await page.evaluate(() => window.recurrenceStore.getState().tasks[0].recurrence), undefined)
  await page.getByRole('heading', { name: 'Editar tarefa', exact: true }).waitFor({ state: 'hidden' })
  console.log('PASS edit: configure, reopen, change project, and remove individual recurrence')

  // Exercise the same form in creation mode with a preselected project.
  await page.evaluate(async (projectId) => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { TaskFormSheet } = await import('/src/components/tasks/TaskFormSheet.tsx')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = ReactDOM.createRoot(host)
    root.render(React.createElement(TaskFormSheet, { open: true, defaultProjectId: projectId, onClose: () => root.unmount() }))
  }, project.id)
  await page.getByPlaceholder('Ex: Enviar proposta para o cliente').fill('Nova tarefa recorrente')
  await page.getByRole('button', { name: 'Não repete', exact: true }).click()
  await page.getByRole('button', { name: 'Diariamente', exact: true }).click()
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
  const added = await page.evaluate(() => window.recurrenceStore.getState().tasks.find((t) => t.title === 'Nova tarefa recorrente'))
  assert.equal(added.projectId, project.id)
  assert.equal(added.recurrence.frequency, 'daily')
  assert.equal(added.seriesId, added.id)
  console.log('PASS create: recurrence is saved with the preselected project')

  async function generate(projects, tasks) {
    return page.evaluate(({ projects, tasks }) => {
      const store = window.recurrenceStore
      store.setState({ projects, tasks, notifications: [], loading: false })
      store.getState().checkDueRecurrences()
      store.getState().checkDueRecurrences()
      return { projects: store.getState().projects, tasks: store.getState().tasks }
    }, { projects, tasks })
  }
  const yesterday = '2026-11-15T12:00:00.000Z'
  const recurring = {
    ...task, createdAt: yesterday, updatedAt: yesterday, recurrence: { frequency: 'daily' }, seriesId: task.id,
    dueDate: '2026-11-16T00:00:00.000Z', status: 'done', notFulfilled: true, completedAt: yesterday,
    subtasks: [{ id: 'sub-1', title: 'Capítulo', done: true, notFulfilled: true }],
    comments: [{ id: 'comment-1', authorId: 'test-user', text: 'Concluído', createdAt: yesterday }], links: ['https://example.com'],
  }
  const unrelated = { ...task, id: 'other-task', title: 'Outra tarefa' }
  const generated = await generate([{ ...project, status: 'completed', completionAck: true }], [recurring, unrelated])
  assert.equal(generated.tasks.length, 3, 'only one cycle despite checking twice')
  const next = generated.tasks.find((t) => t.id !== recurring.id && t.id !== unrelated.id)
  assert.equal(next.projectId, project.id)
  assert.equal(next.seriesId, recurring.id)
  assert.equal(next.recurrence.frequency, 'daily')
  assert.equal(next.createdAt, '2026-11-16T03:00:00.000Z')
  assert.equal(next.dueDate, '2026-11-17T00:00:00.000Z')
  assert.equal(next.status, 'todo')
  assert.equal(next.notFulfilled, false)
  assert.equal(next.completedAt, undefined)
  assert.deepEqual(next.comments, [])
  assert.deepEqual(next.subtasks, [{ ...recurring.subtasks[0], done: false, notFulfilled: false }])
  assert.deepEqual(next.assigneeIds, recurring.assigneeIds)
  assert.deepEqual(next.links, recurring.links)
  assert.equal(generated.tasks[0].recurrence, undefined)
  assert.deepEqual(generated.tasks[1], unrelated)
  assert.equal(generated.projects[0].status, 'active')
  assert.equal(generated.projects[0].completionAck, false)
  console.log('PASS generation: project, dates, assignees, checklist, history, idempotency, and project reactivation')

  const standalone = await generate([project], [{ ...recurring, projectId: undefined }])
  assert.equal(standalone.tasks.length, 2)
  assert.equal(standalone.tasks[1].projectId, undefined)
  const expired = await generate([project], [{ ...recurring, recurrence: { frequency: 'daily', endDate: '2026-11-15T00:00:00.000Z' } }])
  assert.equal(expired.tasks.length, 1)
  const weekly = await generate([project], [{ ...recurring, recurrence: { frequency: 'weekly', weekdays: [1] } }])
  assert.equal(weekly.tasks.length, 2)
  const monthly = await generate([project], [{ ...recurring, recurrence: { frequency: 'monthly', dayOfMonth: 16 } }])
  assert.equal(monthly.tasks.length, 2)
  console.log('PASS standalone, weekly, monthly, and end date')

  const mixed = await generate(
    [{ ...project, createdAt: yesterday, recurrence: { frequency: 'daily' } }],
    [{ ...recurring, id: 'history-task', recurrence: undefined }, recurring, unrelated],
  )
  assert.equal(mixed.projects.length, 2)
  const newProjectTasks = mixed.tasks.filter((t) => t.projectId !== project.id)
  assert.equal(newProjectTasks.length, 1, 'project recurrence must not duplicate independent tasks or their history')
  assert.equal(newProjectTasks[0].title, unrelated.title)
  assert.equal(mixed.tasks.filter((t) => t.recurrence).length, 1)
  assert.equal(mixed.tasks.find((t) => t.recurrence).projectId, project.id)
  console.log('PASS project recurrence: individual cadence takes precedence without duplicating its history')

  const persisted = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('history-task'))
  await page.evaluate(() => window.recurrenceStore.getState().updateTask('history-task', { recurrence: { frequency: 'daily' } }))
  assert.equal(await page.evaluate(() => window.recurrenceStore.getState().tasks.find((t) => t.id === 'history-task').seriesId), 'history-task')
  await persisted
  assert.ok(writes.some((write) => write.table === 'tasks' && write.method === 'PATCH' && write.body.recurrence?.frequency === 'daily' && write.body.project_id === project.id))
  assert.ok(writes.some((write) => write.table === 'tasks' && write.method === 'POST' && write.body.recurrence?.frequency === 'daily' && write.body.project_id === project.id))
  console.log('PASS persistence: database writes include the project and independent rule')
  await context.close()
} finally {
  await browser.close()
}
