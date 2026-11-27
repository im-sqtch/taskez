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
    // O `*` cobre o `?t=` que o Vite acrescenta aos imports depois de um HMR.
    await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
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
    // O prazo em UTC precisa continuar no dia certo no fuso do Brasil.
    if (viewport.width >= 1024) assert.equal(await page.locator('[data-calendar-day="2026-11-26"]').getByRole('button', { name: 'Tarefa teste', exact: true }).count(), 1)
    else assert.equal(await page.getByRole('region', { name: 'Tarefas do dia selecionado' }).getByText('Tarefa teste', { exact: true }).count(), 1)
    assert.equal(await page.getByText('Outra workspace', { exact: true }).count(), 0)
    const visibleNav = viewport.width >= 1024 ? page.locator('aside').first() : page.locator('nav').last()
    assert.equal(await visibleNav.getByRole('link', { name: 'Calendário', exact: true }).count(), 1)
    assert.equal(await visibleNav.getByRole('link', { name: 'Tarefas', exact: true }).count(), viewport.width >= 1024 ? 1 : 0)
    if (viewport.width >= 1024) {
      const labels = await visibleNav.getByRole('link').allTextContents()
      assert.equal(labels.indexOf('Calendário'), labels.indexOf('Tarefas') + 1)
    }
    const desktop = viewport.width >= 1024
    const day26 = page.locator('[data-calendar-day="2026-11-26"]')

    // Abrir uma tarefa: no desktop pela etiqueta + cartão rápido; no celular tocando o dia e a tarefa da lista.
    if (desktop) {
      await day26.getByRole('button', { name: 'Tarefa teste', exact: true }).click()
      await page.getByRole('dialog', { name: 'Resumo de Tarefa teste' }).waitFor()
      await page.getByRole('button', { name: 'Abrir detalhes', exact: true }).click()
    } else {
      assert.match(await day26.getAttribute('aria-label'), /2 tarefas/)
      await day26.click()
      await page.getByRole('region', { name: 'Tarefas do dia selecionado' }).getByText('Tarefa teste', { exact: true }).click()
    }
    await page.getByRole('heading', { name: 'Tarefa teste', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Voltar ao calendário', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/calendar')
    await page.locator('[data-scroll-pane="calendar-detail"]').waitFor({ state: 'detached' })
    assert.match(page.url(), /date=2026-11-26/)
    assert.match(page.url(), /view=month/)

    // Clicar no espaço vazio de um dia (desktop) cria tarefa já com a data.
    if (desktop) {
      await page.locator('[data-calendar-day="2026-11-19"]').click({ position: { x: 60, y: 80 } })
      await page.getByRole('button', { name: '19 de nov', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    }

    // Grade de horas (desktop): clicar num horário cria a tarefa já com dia e hora.
    if (desktop) {
      await page.getByRole('radio', { name: 'Semana', exact: true }).click()
      const grid = page.locator('[data-calendar-zone="timed"]').nth(4)
      await grid.click({ position: { x: 30, y: 14 * 48 + 5 } })
      assert.equal(await page.locator('#task-due-time').inputValue(), '14:00')
      await page.getByRole('button', { name: '26 de nov', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Fechar', exact: true }).click()
      await page.getByPlaceholder('Ex: Enviar proposta para o cliente').waitFor({ state: 'detached' })
    }

    for (const [view, label] of [['day', 'Dia'], ['week', 'Semana'], ['agenda', 'Agenda'], ['month', 'Mês']]) {
      await page.getByRole('radio', { name: label, exact: true }).click()
      await page.waitForURL((url) => url.searchParams.get('view') === view)
      assert.ok(await page.getByText('Tarefa teste', { exact: true }).count() > 0, `"Tarefa teste" deve aparecer na visualização ${view}`)
    }

    if (!desktop) await page.getByRole('button', { name: 'Filtros do calendário' }).click()
    await page.getByRole('switch', { name: 'Mostrar concluídas' }).click()
    await page.waitForURL((url) => url.searchParams.get('completed') === 'false')
    await page.getByText('Entrega concluída', { exact: true }).first().waitFor({ state: 'detached' })
    await page.getByRole('checkbox', { name: 'Projeto teste' }).click()
    await page.waitForURL((url) => url.searchParams.getAll('hide').includes('project-1'))
    await page.getByRole('main').getByText('Tarefa teste', { exact: true }).first().waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await page.waitForURL((url) => !url.searchParams.has('hide') && !url.searchParams.has('completed'))
    await page.getByText('Tarefa teste', { exact: true }).first().waitFor()

    await page.getByRole('button', { name: 'Tarefas sem data' }).click()
    await page.getByText('Planejar próxima entrega', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Voltar ao calendário', exact: true }).click()
    await page.waitForURL((url) => !url.searchParams.has('undated'))

    await page.getByRole('button', { name: 'Pesquisar no calendário' }).click()
    await page.getByRole('searchbox').fill('inexistente')
    await page.getByText('Nenhuma tarefa encontrada.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Fechar pesquisa' }).click()
    await page.getByRole('heading', { name: 'Novembro de 2026', exact: true }).waitFor()

    await page.getByRole('button', { name: 'Próximo período', exact: true }).click()
    await page.waitForURL((url) => url.searchParams.get('date') === '2026-12-26')
    await page.getByRole('heading', { name: 'Dezembro de 2026', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Período anterior', exact: true }).click()
    await page.getByRole('heading', { name: 'Novembro de 2026', exact: true }).waitFor()

    if (desktop) await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
    else await page.getByRole('button', { name: 'Criar tarefa em Quinta-feira, 26 de novembro', exact: true }).click()
    await page.getByPlaceholder('Ex: Enviar proposta para o cliente').fill('Criada pelo calendário')
    await page.getByRole('button', { name: '26 de nov', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
    await page.waitForFunction(() => document.body.textContent.includes('Criada pelo calendário'))
    assert.ok(writes.some((w) => w.url.includes('/tasks') && w.data.title === 'Criada pelo calendário' && w.data.due_date === '2026-11-26T00:00:00.000Z'))

    // Arrastar uma etiqueta para outro dia muda o prazo (desktop).
    if (desktop) {
      // Espera o Sheet de criação terminar a animação de saída (ele cobre a tela).
      await page.getByPlaceholder('Ex: Enviar proposta para o cliente').waitFor({ state: 'detached' })
      await page.waitForTimeout(400)
      const chip = await day26.getByRole('button', { name: 'Tarefa teste', exact: true }).boundingBox()
      const target = await page.locator('[data-calendar-day="2026-11-27"]').boundingBox()
      await page.mouse.move(chip.x + 10, chip.y + 10)
      await page.mouse.down()
      for (let step = 1; step <= 12; step++) {
        await page.mouse.move(chip.x + 10 + (target.x + 40 - chip.x) * step / 12, chip.y + 10 + (target.y + 60 - chip.y) * step / 12)
        await page.waitForTimeout(16)
      }
      await page.mouse.up()
      await page.locator('[data-calendar-day="2026-11-27"]').getByRole('button', { name: 'Tarefa teste', exact: true }).waitFor()
      assert.ok(writes.some((w) => w.url.includes('/tasks') && w.data.due_date === '2026-11-27T00:00:00.000Z'))
    }

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (viewport.width === 1440 || viewport.width === 375) {
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('[data-screen-panel]').scrollTo(0, 0) })
      await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/taskez-calendar-${viewport.width}.png`, fullPage: true })
      await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light') })
      await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/taskez-calendar-light-${viewport.width}.png`, fullPage: true })
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${viewport.width}x${viewport.height}: navegação, visualizações, cartão rápido, detalhes, filtros, sem data, busca, criação, arraste, isolamento de workspace e overflow`)
    await context.close()
  }
} finally {
  await browser.close()
}

