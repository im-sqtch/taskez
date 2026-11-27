import { createClient } from '@supabase/supabase-js'
import { configureWriteQueue, flushWriteQueue, isPostgrestQuery, sendWrite, type WriteError } from '@/lib/writeQueue'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Os query builders do supabase-js são "thenables" preguiçosos: a requisição só é
// disparada quando algo chama `.then()`/await neles. Um `void builder` sozinho
// nunca executa a chamada. Use isto para escritas "fire-and-forget" (otimistas,
// já refletidas no estado local) sem precisar tornar a action async.
//
// Escritas que falham por falta de rede entram na fila de pendências
// (writeQueue) e são reenviadas quando a conexão volta. Só erros do próprio
// banco chegam ao handler registrado pelo dataStore (ver
// setFireAndForgetErrorHandler), que avisa o usuário — indireção só para não
// criar dependência circular entre esta lib e o store de aplicação.
type FireAndForgetErrorHandler = (error: WriteError) => void
let onFireAndForgetError: FireAndForgetErrorHandler | null = null
export function setFireAndForgetErrorHandler(handler: FireAndForgetErrorHandler) {
  onFireAndForgetError = handler
}

export function fireAndForget(query: PromiseLike<unknown>) {
  // Captura a stack AQUI, de forma síncrona no call site — depois do await ela
  // só apontaria pro microtask interno do supabase-js, sem indicar de onde a
  // escrita partiu. `new Error()` é barato (não lança); só usamos `.stack`.
  const callSite = new Error().stack

  if (isPostgrestQuery(query)) {
    void sendWrite(query).then((result) => {
      if (result.error) reportFireAndForgetFailure(result.error, callSite)
    })
    return
  }

  Promise.resolve(query).then(
    (result) => {
      // ATENÇÃO: o supabase-js NUNCA rejeita a Promise por erro de RLS,
      // constraint ou coluna sem GRANT — ele resolve normalmente com
      // `{ data: null, error: {...} }`. Por isso o erro é lido do resultado.
      const error = result && typeof result === 'object' ? (result as { error?: WriteError | null }).error : undefined
      if (error) reportFireAndForgetFailure(error, callSite)
    },
    (error: unknown) => reportFireAndForgetFailure({ message: String(error) }, callSite), // rejeição real (exceção JS)
  )
}

let lastWarnedAt = 0
function reportFireAndForgetFailure(error: WriteError, callSite: string | undefined) {
  console.error('[fireAndForget] escrita otimista falhou — estado local pode estar dessincronizado do banco', error, callSite)
  // Debounce simples: uma rajada de falhas deve avisar uma vez, não inundar a
  // UI de notificações idênticas.
  const now = Date.now()
  if (now - lastWarnedAt < 10_000) return
  lastWarnedAt = now
  onFireAndForgetError?.(error)
}

// Quem está logado (registrado pelo authStore/dataStore) — a fila só reenvia
// escritas da conta atual.
let currentUserIdGetter: () => string | null = () => null
export function setWriteQueueUser(getter: () => string | null) {
  currentUserIdGetter = getter
  void flushWriteQueue()
}

configureWriteQueue({
  anonKey: supabaseAnonKey,
  getUserId: () => currentUserIdGetter(),
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  refreshAccessToken: async () => (await supabase.auth.refreshSession()).data.session?.access_token ?? null,
  onPermanentError: (error) => reportFireAndForgetFailure(error, undefined),
})

