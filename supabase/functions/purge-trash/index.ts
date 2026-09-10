// Chamada diariamente pelo pg_cron (via pg_net, mesmo padrão de "send-push")
// para apagar DE VEZ tudo que está na lixeira há mais de 30 dias — soft-
// delete vira hard-delete. Precisa ser uma Edge Function (não uma function
// SQL pura) porque o Storage é um serviço HTTP separado do banco: nenhuma
// function do Postgres consegue remover um blob do bucket sozinha.
import { createClient } from 'npm:@supabase/supabase-js@2'

const PURGE_TRIGGER_SECRET = Deno.env.get('PURGE_TRIGGER_SECRET')!
const RETENTION_DAYS = 30

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  // Só o pg_cron (via trigger_purge_trash no banco) conhece este segredo —
  // evita que qualquer um dispare uma purga arbitrária chamando a função
  // publicamente.
  if (req.headers.get('x-purge-secret') !== PURGE_TRIGGER_SECRET) {
    return new Response('Forbidden', { status: 403 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Arquivos primeiro: precisa do storage_path ANTES de apagar a linha, e o
  // blob no bucket some só depois que a remoção é confirmada — senão um
  // erro no meio deixaria o registro sumido mas o blob órfão pra sempre.
  const { data: expiredFiles, error: filesSelectError } = await supabase
    .from('files')
    .select('id, storage_path')
    .lt('deleted_at', cutoff)
    .not('deleted_at', 'is', null)

  const results = { filesRemoved: 0, tasksRemoved: 0, projectsRemoved: 0, storageErrors: [] as string[] }

  if (filesSelectError) {
    return new Response(JSON.stringify({ error: filesSelectError.message }), { status: 500 })
  }

  if (expiredFiles && expiredFiles.length > 0) {
    const paths = expiredFiles.map((f) => f.storage_path)
    const { error: storageError } = await supabase.storage.from('project-files').remove(paths)
    // Segue mesmo se o storage falhar (ex.: blob já não existia) — melhor
    // limpar a linha do banco e deixar um blob órfão raro do que travar a
    // purga inteira por causa de um único arquivo com problema.
    if (storageError) results.storageErrors.push(storageError.message)

    const { error: deleteError, count } = await supabase
      .from('files')
      .delete({ count: 'exact' })
      .lt('deleted_at', cutoff)
      .not('deleted_at', 'is', null)
    if (deleteError) return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
    results.filesRemoved = count ?? 0
  }

  // Tarefas antes de projetos: quando o projeto expirado for apagado, o
  // `on delete cascade` de chat_messages dispara — não há motivo pra
  // depender dessa ordem pras tarefas (a FK delas é `on delete set null`),
  // mas apagar de baixo pra cima evita qualquer surpresa futura se o schema
  // mudar.
  const { error: taskDeleteError, count: taskCount } = await supabase
    .from('tasks')
    .delete({ count: 'exact' })
    .lt('deleted_at', cutoff)
    .not('deleted_at', 'is', null)
  if (taskDeleteError) return new Response(JSON.stringify({ error: taskDeleteError.message, ...results }), { status: 500 })
  results.tasksRemoved = taskCount ?? 0

  const { error: projectDeleteError, count: projectCount } = await supabase
    .from('projects')
    .delete({ count: 'exact' })
    .lt('deleted_at', cutoff)
    .not('deleted_at', 'is', null)
  if (projectDeleteError) return new Response(JSON.stringify({ error: projectDeleteError.message, ...results }), { status: 500 })
  results.projectsRemoved = projectCount ?? 0

  return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
