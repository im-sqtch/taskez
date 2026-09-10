// Apaga a conta de verdade — auth.users, e por cascata (ver migration
// 20260910120000_delete_account_fk_fixes.sql) tudo que depende dela.
// Diferente de send-push/purge-trash (chamadas servidor-pra-servidor com um
// segredo compartilhado), esta é chamada direto do browser pelo próprio
// usuário via supabase.functions.invoke() — a autenticação é o JWT da sessão
// dele (propagado automaticamente no header Authorization), não um secret.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  // Client "como o usuário" — resolve quem está chamando a partir do JWT que
  // o supabase-js já propaga automaticamente em functions.invoke().
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userError } = await asUser.auth.getUser()
  if (userError || !userData.user?.email) return json({ error: 'Unauthorized' }, 401)
  const userId = userData.user.id
  const email = userData.user.email

  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  if (!password) return json({ error: 'Senha obrigatória.' }, 400)

  // Reautentica com a senha atual — prova que é a pessoa mesmo, não só uma
  // sessão aberta esquecida num aparelho. Client novo e descartável (anon),
  // não toca na sessão real do usuário que está chamando.
  const reauth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { error: passwordError } = await reauth.auth.signInWithPassword({ email, password })
  if (passwordError) return json({ error: 'Senha incorreta.' }, 401)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Workspaces das quais é dona: se alguma tiver outra pessoa além dela,
  // bloqueia a exclusão inteira — não existe hoje transferência de
  // titularidade, então apagar a conta apagaria o acesso de todo mundo ali
  // sem aviso prévio. Workspaces onde ela é a única integrante são
  // removidas junto, sem bloquear nada (a cascata do banco já cuida de
  // tudo dentro delas).
  const { data: ownedWorkspaces, error: ownedError } = await admin.from('workspaces').select('id, name').eq('created_by', userId)
  if (ownedError) return json({ error: ownedError.message }, 500)

  const blockingNames: string[] = []
  const soloWorkspaceIds: string[] = []
  for (const ws of ownedWorkspaces ?? []) {
    const { count } = await admin.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id as string)
    if ((count ?? 0) > 1) blockingNames.push(ws.name as string)
    else soloWorkspaceIds.push(ws.id as string)
  }

  if (blockingNames.length > 0) {
    return json(
      {
        error: `Você ainda é dono(a) de workspaces com outras pessoas: ${blockingNames.join(', ')}. Saia, transfira ou apague cada uma antes de excluir a conta.`,
      },
      409,
    )
  }

  if (soloWorkspaceIds.length > 0) {
    const { error: deleteWsError } = await admin.from('workspaces').delete().in('id', soloWorkspaceIds)
    if (deleteWsError) return json({ error: deleteWsError.message }, 500)
  }

  // Cascata cuida do resto: workspace_members/contacts/notifications/
  // push_subscriptions/scheduled_notifications/dashboard_layouts têm FK "on
  // delete cascade" para profiles; files.uploaded_by, team_members.
  // linked_user_id e *.deleted_by têm "on delete set null" (migration
  // 20260910120000) — o que a pessoa deixou em workspaces alheias sobrevive,
  // só perde a atribuição a ela.
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) return json({ error: deleteUserError.message }, 500)

  return json({ ok: true }, 200)
})
