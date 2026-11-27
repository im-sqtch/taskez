// Foto de perfil: enviar (reduzida para 256×256 JPEG), mostrar e remover.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
// PLAYWRIGHT_CHANNEL vazio usa o Chromium do próprio Playwright (padrão: Edge).
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })

const createdAt = '2026-09-26T12:00:00.000Z'
const responses = {
  workspace_members: [{ workspace_id: 'workspace-1', role: 'owner', workspaces: { id: 'workspace-1', name: 'Meu workspace', color: '#7c5cff', default_assignee_id: null, created_by: 'test-user', created_at: createdAt } }],
  team_members: [{ id: 'member-1', workspace_id: 'workspace-1', name: 'Teste', role: 'Organizador', avatar_color: '#123456', avatar_url: null, status: 'online', workload: 0, linked_user_id: 'test-user', created_at: createdAt }],
}

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/src/store/authStore.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `import { create } from '/node_modules/.vite/deps/zustand.js';
      const user = { id: 'test-user', name: 'Teste', email: 'test@example.com', avatarColor: '#123456', usageMode: 'personal', timezone: 'UTC-3' };
      export const useAuthStore = create((set, get) => ({ currentUserId: user.id, profile: user, authReady: true, hasHydrated: true,
        hasSeenOnboarding: true, currentUser: () => get().profile,
        updateProfile: async (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })) }));`,
  }))
  const uploads = []
  const removals = []
  const teamPatches = []
  let photoBytes = null
  await context.route('**/*.supabase.co/**', (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('/storage/v1/object/avatars/') && request.method() === 'POST') {
      uploads.push({ url, type: request.headers()['content-type'], size: request.postDataBuffer()?.length ?? 0 })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'avatars/x' }) })
    }
    if (url.includes('/storage/v1/object/public/avatars/')) return route.fulfill({ status: 200, contentType: 'image/png', body: photoBytes })
    if (url.includes('/storage/v1/object/avatars') && request.method() === 'DELETE') {
      removals.push(request.postDataJSON())
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    if (url.includes('/rest/v1/team_members') && request.method() === 'PATCH') teamPatches.push(request.postDataJSON())
    const table = Object.keys(responses).find((name) => url.includes(`/rest/v1/${name}`))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table && request.method() === 'GET' ? responses[table] : []) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/settings`)
  await page.locator('button', { hasText: 'test@example.com' }).first().click()
  await page.getByRole('button', { name: 'Adicionar foto' }).waitFor()
  // Uma imagem 400×300 gerada no próprio navegador (não quadrada, para testar o recorte).
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const context = canvas.getContext('2d')
    context.fillStyle = '#e33'
    context.fillRect(0, 0, 400, 300)
    return canvas.toDataURL('image/png')
  })
  const png = Buffer.from(dataUrl.split(',')[1], 'base64')
  photoBytes = png
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Trocar foto' }).waitFor()
  assert.equal(uploads.length, 1)
  assert.match(uploads[0].url, /\/avatars\/test-user\/[0-9a-f-]+\.jpg$/)
  assert.ok(teamPatches.some((patch) => patch.avatar_url?.includes('/storage/v1/object/public/avatars/test-user/')), 'a foto vai para a equipe também')
  await page.getByRole('dialog', { name: 'Editar perfil' }).locator('img[src*="/object/public/avatars/test-user/"]').waitFor()
  console.log('PASS enviar foto: reduzida, salva no perfil e na equipe')

  await page.getByRole('button', { name: 'Remover foto' }).click()
  await page.getByRole('button', { name: 'Adicionar foto' }).waitFor()
  assert.equal(removals.length, 1)
  assert.ok(teamPatches.at(-1).avatar_url === null)
  console.log('PASS remover foto: arquivo apagado e iniciais de volta')
  assert.deepEqual(errors, [])
  await context.close()
} finally {
  await browser.close()
}
