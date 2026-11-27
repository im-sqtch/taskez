// Teste de fumaça do BUILD DE PRODUÇÃO: sobe `vite preview` com o que está em
// dist/ e confere que as páginas renderizam sem erro de JavaScript.
//
// Os testes de navegador rodam no servidor de desenvolvimento, que carrega os
// módulos de outro jeito; um problema de ordem de carregamento (import
// circular) só aparece no bundle de produção — foi assim que o app ficou com
// a tela preta em 27/11/2026. Rode depois de `npm run build`.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { setTimeout as sleep } from 'node:timers/promises'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')

const PORT = 4174
const base = `http://localhost:${PORT}`
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'ignore', 'inherit'] })
let ready = false
for (let i = 0; i < 120 && !ready; i++) {
  ready = await fetch(base).then((response) => response.ok, () => false)
  if (!ready) await sleep(250)
}
if (!ready) {
  server.kill()
  console.error('vite preview não subiu (rodou `npm run build` antes?)')
  process.exit(1)
}

const channel = process.env.PLAYWRIGHT_CHANNEL ?? ''
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true })
let failed = false
try {
  for (const [path, viewport] of [['/', { width: 390, height: 844 }], ['/login', { width: 1440, height: 900 }], ['/dashboard', { width: 1440, height: 900 }]]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    // Sem rede para o Supabase: o app precisa abrir mesmo assim (tela de entrada).
    await page.route('**/*.supabase.co/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await page.goto(`${base}${path}`)
    await page.waitForTimeout(1500)
    const text = (await page.locator('#root').innerText()).trim()
    if (errors.length || !text) {
      failed = true
      console.error(`FALHOU ${path}: ${errors.join(' | ') || 'tela vazia'}`)
    } else console.log(`PASS build ${path}: renderiza sem erros (${text.split('\n')[0].slice(0, 40)}…)`)
    await page.close()
  }
} finally {
  await browser.close()
  server.kill()
}
process.exit(failed ? 1 : 0)
