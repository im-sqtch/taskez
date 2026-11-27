// Tabelas das tarefas: colunas com tipo, menu do cabeçalho (renomear, tipo,
// mover), reordenar linhas e copiar valores (botão no desktop, segurar no celular).
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })

const createdAt = '2026-11-20T12:00:00.000Z'
const table = {
  id: 'table-1',
  title: 'Orçamento',
  columns: [
    { id: 'c-name', title: 'Item' },
    { id: 'c-price', title: 'Valor', type: 'brl' },
    { id: 'c-status', title: 'Status', type: 'select', options: [{ id: 'o-ok', name: 'Pago', color: '#34D399' }] },
    { id: 'c-who', title: 'Responsável', type: 'person' },
    { id: 'c-done', title: 'Feito', type: 'checkbox' },
  ],
  rows: [
    { id: 'r1', cells: { 'c-name': 'Hospedagem', 'c-price': '1234.5', 'c-status': 'o-ok', 'c-who': ['member-1'], 'c-done': 'done' } },
    { id: 'r2', cells: { 'c-name': 'Domínio', 'c-price': '40', 'c-status': '', 'c-who': [], 'c-done': 'failed' } },
  ],
}
const row = {
  id: 'task-1', workspace_id: 'workspace-1', project_id: null, title: 'Planejar site', description: null, status: 'todo', not_fulfilled: false,
  priority: 'medium', due_date: null, due_time: null, duration_minutes: null, reminder_minutes: null,
  assignee_ids: [], subtasks: [], comments: [], links: [], tables: [table], created_at: createdAt, updated_at: createdAt, completed_at: null, order: 0,
  recurrence: null, series_id: null, deleted_at: null, deleted_by: null,
}
const responses = {
  workspace_members: [{ workspace_id: 'workspace-1', role: 'owner', workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', default_assignee_id: null, created_by: 'test-user', created_at: createdAt } }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Ana Souza', role: 'Organizadora', avatar_color: '#123456', status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
  tasks: [row],
}

async function setup(contextOptions) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo', ...contextOptions })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
  await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `const user = { id: 'test-user', name: 'Ana Souza', email: 'test@example.com', avatarColor: '#123456' };
      const state = { currentUserId: user.id, profile: user, authReady: true, hasHydrated: true, hasSeenOnboarding: true, currentUser: () => user };
      export const useAuthStore = (selector) => selector(state);
      useAuthStore.getState = () => state;`,
  }))
  const patches = []
  await context.route('**/*.supabase.co/**', (route) => {
    const request = route.request()
    if (request.method() === 'PATCH' && request.url().includes('/rest/v1/tasks')) patches.push(request.postDataJSON())
    const name = Object.keys(responses).find((item) => request.url().includes(`/rest/v1/${item}`))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(name ? responses[name] : []) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/tasks/task-1`)
  await page.getByText('Orçamento').waitFor()
  return { context, page, patches, errors }
}

const lastTable = (patches) => patches.findLast((patch) => patch.tables)?.tables[0]

try {
  // Desktop
  {
    const { context, page, patches, errors } = await setup({ viewport: { width: 1280, height: 900 } })
    await page.getByText('R$ 1.234,50').waitFor()
    await page.getByText('Pago').waitFor()
    await page.screenshot({ path: path.join(process.env.TEMP, 'taskTables-desktop.png') })

    // Copiar: o botão aparece ao passar o mouse.
    const cell = page.locator('td').filter({ hasText: 'R$ 1.234,50' })
    const copyButton = cell.getByRole('button', { name: 'Copiar valor' })
    assert.equal(await copyButton.isVisible(), false, 'o botão de copiar só aparece com o mouse em cima')
    await cell.hover()
    await copyButton.click()
    await cell.getByText('Copiado').waitFor()
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'R$ 1.234,50')
    console.log('PASS desktop: botão de copiar ao passar o mouse')

    // Fora do modo edição: clicar na célula já permite alterar o valor.
    const price = page.getByRole('button', { name: 'Editar Valor: R$ 40,00' })
    const priceBackground = await price.evaluate((element) => getComputedStyle(element.closest('td')).backgroundColor)
    await price.click()
    const priceInput = page.getByRole('textbox', { name: 'Valor, linha' })
    assert.equal(await priceInput.evaluate((element) => getComputedStyle(element.closest('td')).backgroundColor), priceBackground, 'o fundo da célula não muda ao digitar')
    assert.equal(await priceInput.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)')
    await priceInput.fill('2.500,75')
    await priceInput.press('Enter')
    assert.equal(lastTable(patches).rows[1].cells['c-price'], '2500.75')
    await page.getByText('R$ 2.500,75').waitFor()
    await page.getByRole('button', { name: /Feito: Não cumprido/ }).click()
    assert.equal(lastTable(patches).rows[1].cells['c-done'], '')
    await page.getByRole('button', { name: 'Status: escolher opção' }).nth(1).click()
    await page.getByRole('textbox', { name: 'Buscar ou criar opção' }).fill('Pendente')
    await page.keyboard.press('Enter')
    await page.locator('tbody').getByText('Pendente').waitFor()
    await page.waitForTimeout(200)
    const statusColumn = lastTable(patches).columns.find((column) => column.id === 'c-status')
    assert.equal(lastTable(patches).rows[1].cells['c-status'], statusColumn.options.find((option) => option.name === 'Pendente').id)
    await page.keyboard.press('Escape')
    // Largura fixa: digitar, passar o mouse e mostrar o botão de copiar não mudam a célula.
    const itemCell = page.locator('tbody tr').nth(1).locator('td').first()
    const widthBefore = (await itemCell.boundingBox()).width
    await page.getByRole('button', { name: 'Editar Item: Domínio' }).click()
    const itemInput = page.getByRole('textbox', { name: 'Item, linha' })
    await itemInput.fill('D')
    assert.equal((await itemCell.boundingBox()).width, widthBefore, 'digitar uma letra não muda a largura')
    await itemInput.fill('Domínio .com com um texto bem comprido que não cabe na coluna')
    assert.equal((await itemCell.boundingBox()).width, widthBefore, 'texto comprido não muda a largura')
    // Shift+Enter pula linha; Enter conclui.
    await itemInput.press('Shift+Enter')
    await itemInput.pressSequentially('segunda linha')
    await itemInput.press('Enter')
    assert.equal(lastTable(patches).rows[1].cells['c-name'], 'Domínio .com com um texto bem comprido que não cabe na coluna\nsegunda linha')
    await itemCell.hover()
    await itemCell.getByRole('button', { name: 'Copiar valor' }).waitFor()
    assert.equal((await itemCell.boundingBox()).width, widthBefore, 'o botão de copiar não muda a largura')
    console.log('PASS desktop: largura fixa e Shift+Enter')

    // Quebrar texto: a célula cresce na vertical.
    const heightBefore = (await itemCell.boundingBox()).height
    await page.getByRole('button', { name: 'Opções da tabela' }).click()
    await page.getByRole('menuitemradio', { name: 'Quebrar texto: desativado' }).click()
    await page.keyboard.press('Escape')
    assert.equal(lastTable(patches).wrap, true)
    await page.waitForTimeout(100)
    assert.ok((await itemCell.boundingBox()).height > heightBefore + 20, 'com quebra, a célula fica mais alta')
    assert.equal((await itemCell.boundingBox()).width, widthBefore)
    await page.screenshot({ path: path.join(process.env.TEMP, 'taskTables-wrap.png') })
    await page.getByRole('button', { name: 'Opções da tabela' }).click()
    await page.getByRole('menuitemradio', { name: 'Quebrar texto: ativado' }).click()
    await page.keyboard.press('Escape')
    console.log('PASS desktop: quebrar texto liga e desliga')

    await page.getByRole('button', { name: /^Editar Item: Domínio/ }).click()
    await itemInput.fill('Domínio .com')
    await page.keyboard.press('Enter')
    assert.equal(lastTable(patches).rows[1].cells['c-name'], 'Domínio .com')
    await page.screenshot({ path: path.join(process.env.TEMP, 'taskTables-inline.png') })
    console.log('PASS desktop: edição direta na célula, sem mudar o fundo')

    // Menu do cabeçalho: renomear, mover e trocar o tipo.
    await page.getByRole('button', { name: 'Opções da coluna Item' }).click()
    await page.getByRole('textbox', { name: 'Nome da coluna' }).fill('Descrição')
    await page.getByRole('menuitem', { name: 'Mover para a direita' }).click()
    await page.keyboard.press('Escape')
    let saved = lastTable(patches)
    assert.equal(saved.columns[1].title, 'Descrição')
    assert.equal(saved.columns[0].id, 'c-price')
    console.log('PASS desktop: renomear e mover coluna')

    await page.getByRole('button', { name: 'Opções da coluna Descrição' }).click()
    await page.getByRole('menuitem', { name: /Tipo: Texto/ }).click()
    await page.getByRole('menuitemradio', { name: 'Select', exact: true }).click()
    saved = lastTable(patches)
    const converted = saved.columns.find((column) => column.id === 'c-name')
    assert.equal(converted.type, 'select')
    assert.deepEqual(converted.options.map((option) => option.name), ['Hospedagem', 'Domínio .com'])
    await page.locator('tbody').getByText('Hospedagem').waitFor()
    console.log('PASS desktop: trocar texto por select cria as opções')

    // Trocar select por número perde os valores: pede confirmação.
    await page.getByRole('button', { name: 'Opções da coluna Status' }).click()
    await page.getByRole('menuitem', { name: /Tipo: Select/ }).click()
    await page.getByRole('menuitemradio', { name: 'Número', exact: true }).click()
    await page.getByRole('button', { name: 'Trocar tipo' }).click()
    saved = lastTable(patches)
    assert.equal(saved.columns.find((column) => column.id === 'c-status').type, 'number')
    console.log('PASS desktop: conversão com perda pede confirmação')

    // Modo edição: descer linha.
    await page.getByRole('button', { name: 'Opções da tabela' }).click()
    await page.getByRole('menuitem', { name: 'Editar tabela' }).click()
    await page.getByRole('button', { name: 'Descer linha' }).first().click()
    assert.deepEqual(lastTable(patches).rows.map((item) => item.id), ['r2', 'r1'])
    assert.equal(await page.getByRole('button', { name: 'Subir linha' }).first().isDisabled(), true)
    await page.screenshot({ path: path.join(process.env.TEMP, 'taskTables-edit.png') })
    console.log('PASS desktop: reordenar linhas no modo edição')

    assert.deepEqual(errors, [])
    await context.close()
  }

  // Celular: segurar o dedo no valor copia.
  {
    const { context, page, errors } = await setup({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const cell = page.locator('td').filter({ hasText: 'Hospedagem' })
    await cell.scrollIntoViewIfNeeded()
    const box = await cell.boundingBox()
    const client = await context.newCDPSession(page)
    const point = { x: box.x + 20, y: box.y + box.height / 2 }
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await page.waitForTimeout(700)
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cell.getByText('Copiado').waitFor()
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Hospedagem')
    await page.screenshot({ path: path.join(process.env.TEMP, 'taskTables-mobile.png') })
    console.log('PASS celular: segurar o dedo copia e mostra "Copiado"')

    assert.deepEqual(errors, [])
    await context.close()
  }
} finally {
  await browser.close()
}
