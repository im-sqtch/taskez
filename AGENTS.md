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
- `node --test tests/*.test.mjs`: testes unitários. Os arquivos `tests/*.browser.mjs` precisam do Playwright.

## Banco de dados
- Toda mudança de schema vira uma migration nova em `supabase/migrations/`, com nome `AAAAMMDDHHMMSS_descricao.sql`. Não edite migrations já aplicadas.
- Toda tabela nova precisa de RLS e de políticas por dono (`user_id = auth.uid()`). Se o app precisar de atualização em tempo real, adicione a tabela a `supabase_realtime`.
- Para aplicar: `supabase db push --remote`.

## Deploy
- Push na `main` publica em produção na Vercel.
- **Nunca publique pela CLI da Vercel (`vercel deploy`) código que não está commitado**, porque o GitHub fica para trás da produção. Faça sempre commit e push.
