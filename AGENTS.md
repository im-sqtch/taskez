# Instruções para agentes de IA (Claude, Codex, Cursor, Copilot etc.)

## Idioma
- Responda e escreva textos de interface em **português do Brasil**, com acentuação correta.
- Mensagens de commit em português, no imperativo e sem acentos, como no histórico (ex.: `Corrigir autor exibido nos comentarios das tarefas`).

## Design
- **Leia [DESIGN.md](DESIGN.md) antes de criar ou alterar qualquer interface.** Ele define tokens, tamanhos de botão, menus, sheets e layout. Siga-o à risca.

## Stack
- React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router, Supabase (Postgres, Auth, Realtime e Edge Functions), hospedado na Vercel.
- Os dados ficam no Supabase: qualquer dado que pertence ao usuário deve ser salvo na conta, e não só no `localStorage`, que serve apenas de cache.
- As escritas otimistas usam `fireAndForget()` de `@/lib/supabase`.

## Comandos
- `npm run dev`: servidor local. Precisa do `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, que você obtém com `vercel env pull .env.local`.
- `npm run build`: checagem de tipos e build. `npm run lint`: oxlint.
- `npm test`: testes unitários (`tests/*.test.mjs`, no fuso de São Paulo).
- `npm run test:build`: depois de `npm run build`, abre o **build de produção** e confere que as páginas renderizam. Erros de ordem de carregamento (import circular entre stores) só aparecem aqui: **nunca use outra store no nível do módulo** (fora de funções).
- `npm run test:browser`: testes de navegador (`tests/*.browser.mjs`). Sobe um Vite próprio na porta 5174 e usa o Chromium do Playwright, que você instala uma vez com `npx playwright install chromium`. Para rodar só um: `npm run test:browser -- calendar`. Os testes simulam o Supabase e não precisam de credenciais.

## Banco de dados
- Toda mudança de schema vira uma migration nova em `supabase/migrations/`, com nome `AAAAMMDDHHMMSS_descricao.sql`. Não edite migrations já aplicadas.
- Toda tabela nova precisa de RLS e de políticas por dono (`user_id = auth.uid()`). Se o app precisar de atualização em tempo real, adicione a tabela a `supabase_realtime`.
- Para aplicar: `supabase db push --remote`.

## Fluxo de trabalho e deploy
- **Nunca faça push direto na `main`.** Ela é protegida: só aceita PR com as verificações do GitHub Actions passando (`.github/workflows/verificacao.yml`: lint, build, testes unitários e de navegador).
- Trabalhe numa branch, abra PR e confira o **preview da Vercel**, que é criado automaticamente para cada branch. Atenção: o preview usa o **mesmo banco de produção**.
- Fazer merge na `main` publica em produção.
- **Nunca publique pela CLI da Vercel (`vercel deploy`) código que não está commitado**, porque o GitHub fica para trás da produção.
- Migrations entram em produção com `supabase db push --remote` e não passam pelo PR. Aplique-as só quando forem compatíveis com o código que já está publicado: colunas e tabelas novas e opcionais.
