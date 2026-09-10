import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Os query builders do supabase-js são "thenables" preguiçosos: a requisição só é
// disparada quando algo chama `.then()`/await neles. Um `void builder` sozinho
// nunca executa a chamada. Use isto para escritas "fire-and-forget" (otimistas,
// já refletidas no estado local) sem precisar tornar a action async.
//
// Registrado pelo dataStore na inicialização (ver setFireAndForgetErrorHandler)
// para avisar visualmente o usuário quando uma escrita falha — indireção só
// para não criar dependência circular entre esta lib e o store de aplicação.
type FireAndForgetErrorHandler = (error: unknown) => void
let onFireAndForgetError: FireAndForgetErrorHandler | null = null
export function setFireAndForgetErrorHandler(handler: FireAndForgetErrorHandler) {
  onFireAndForgetError = handler
}

export function fireAndForget(query: PromiseLike<unknown>) {
  // Captura a stack AQUI, de forma síncrona no call site — depois do await ela
  // só apontaria pro microtask interno do supabase-js, sem indicar de onde a
  // escrita partiu. `new Error()` é barato (não lança); só usamos `.stack`.
  const callSite = new Error().stack

  Promise.resolve(query).then(
    (result) => {
      // ATENÇÃO: o supabase-js NUNCA rejeita a Promise por erro de RLS,
      // constraint ou coluna sem GRANT — ele resolve normalmente com
      // `{ data: null, error: {...} }`. Um `.catch()` sozinho (o
      // comportamento antigo desta função) nunca via esses erros — que são a
      // esmagadora maioria dos casos reais — e a escrita falhava sem
      // nenhum log em lugar nenhum, com a UI seguindo otimista como se
      // tivesse sido salva.
      const error = result && typeof result === 'object' ? (result as { error?: unknown }).error : undefined
      if (error) reportFireAndForgetFailure(error, callSite)
    },
    (error: unknown) => reportFireAndForgetFailure(error, callSite), // rejeição real (rede caída, exceção JS)
  )
}

let lastWarnedAt = 0
function reportFireAndForgetFailure(error: unknown, callSite: string | undefined) {
  console.error('[fireAndForget] escrita otimista falhou — estado local pode estar dessincronizado do banco', error, callSite)
  // Debounce simples: uma rajada de falhas (ex.: internet caiu no meio de
  // várias edições em sequência) deve avisar uma vez, não inundar a UI de
  // notificações idênticas.
  const now = Date.now()
  if (now - lastWarnedAt < 10_000) return
  lastWarnedAt = now
  onFireAndForgetError?.(error)
}
