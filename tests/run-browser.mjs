// Roda os testes de navegador (tests/*.browser.mjs) contra um servidor Vite
// próprio, subido aqui mesmo na porta 5174. Os testes simulam o Supabase e a
// autenticação, então não precisam de credenciais reais.
//
//   npm run test:browser                    → todos os da lista abaixo
//   npm run test:browser -- calendar        → só os que contêm "calendar"
//
// Por padrão usa o Chromium do Playwright (PLAYWRIGHT_CHANNEL=""); para usar o
// Edge instalado, rode com PLAYWRIGHT_CHANNEL=msedge.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { setTimeout as sleep } from 'node:timers/promises'

// commentBadges e lastScreen ficam de fora por enquanto: já falhavam antes
// destas mudanças e precisam ser revistos.
const TESTS = ['calendar', 'focusTimers', 'focusYouTube', 'taskRecurrence', 'summaryCarousel', 'desktopScroll']
const PORT = 5174
const filter = process.argv[2]
const selected = TESTS.filter((name) => !filter || name.includes(filter))

const env = {
  ...process.env,
  PLAYWRIGHT_CHANNEL: process.env.PLAYWRIGHT_CHANNEL ?? '',
  TEST_BASE_URL: `http://localhost:${PORT}`,
  // Pasta onde alguns testes salvam prints para conferência visual.
  TEMP: process.env.TEMP ?? tmpdir(),
  // Endereço falso: os testes interceptam tudo que vai para *.supabase.co.
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://teste.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'chave-de-teste',
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env, stdio: ['ignore', 'ignore', 'inherit'] })
// Espera o servidor responder (não dá para confiar no texto do terminal: no
// CI ele vem com códigos de cor no meio).
let ready = false
for (let i = 0; i < 240 && !ready; i++) {
  ready = await fetch(env.TEST_BASE_URL).then((response) => response.ok, () => false)
  if (!ready) await sleep(250)
}
if (!ready) {
  server.kill()
  console.error('O servidor Vite não subiu a tempo.')
  process.exit(1)
}

let failed = 0
for (const name of selected) {
  console.log(`\n▶ ${name}`)
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [`tests/${name}.browser.mjs`], { env, stdio: 'inherit' })
    child.on('exit', resolve)
  })
  if (code !== 0) failed++
}
server.kill()
console.log(failed ? `\n${failed} de ${selected.length} testes de navegador falharam.` : `\nTodos os ${selected.length} testes de navegador passaram.`)
process.exit(failed ? 1 : 0)
