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

  const listPage = await context.newPage()
  await listPage.goto(`${base}/projects`)
  await listPage.getByText('Projeto teste', { exact: true }).waitFor()
  await listPage.getByRole('img', { name: 'Novas mensagens no chat do projeto' }).waitFor()

  const detailPage = await context.newPage()
  await detailPage.goto(`${base}/tasks/task-1`)
  await detailPage.getByText('Tarefa teste', { exact: true }).first().waitFor()
  await detailPage.getByPlaceholder(/Escreva um comentário/).fill('Comentário entre abas')
  await detailPage.getByRole('button', { name: 'Enviar comentário' }).click()

  const blue = listPage.getByRole('img', { name: 'Novos comentários nas tarefas do projeto' })
  await blue.waitFor()
  const redBox = await listPage.getByRole('img', { name: 'Novas mensagens no chat do projeto' }).boundingBox()
  const blueBox = await blue.boundingBox()
  assert.ok(redBox && blueBox)
  assert.ok(redBox.x + redBox.width <= blueBox.x || blueBox.x + blueBox.width <= redBox.x, 'red and blue badges must not overlap')

  await listPage.getByRole('link', { name: 'Tarefas', exact: true }).click()
  await listPage.getByRole('img', { name: 'Novos comentários na tarefa' }).waitFor()
  console.log('PASS two tabs: blue badge appears instantly on project and task; red and blue do not overlap')
  await context.close()
} finally {
  await browser.close()
}
