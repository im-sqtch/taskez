// Fila de escritas pendentes: o que o app grava enquanto está sem conexão (ou
// quando a rede falha no meio do envio) fica guardado neste aparelho e é
// reenviado, na mesma ordem, quando a conexão volta. Erros do próprio banco
// (permissão, dado inválido) não entram na fila — reenviar não resolveria —
// e são avisados ao usuário com uma mensagem específica.
//
// Funciona com as consultas do supabase-js (PostgREST): em vez de executar a
// consulta, guardamos o pedido HTTP que ela faria (método, URL, cabeçalhos e
// corpo) e o refazemos depois com o token de acesso válido naquele momento.
import { create } from 'zustand'

export interface QueuedWrite {
  id: string
  userId: string | null
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  createdAt: number
}

interface WriteQueueState {
  items: QueuedWrite[]
  online: boolean
  flushing: boolean
  // O navegador diz que há rede, mas o servidor não respondeu na última tentativa.
  stalled: boolean
}

const STORAGE_KEY = 'taskez-pending-writes'
const RETRY_INTERVAL_MS = 30_000

function loadItems(): QueuedWrite[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return raw ? (JSON.parse(raw) as QueuedWrite[]) : []
  } catch {
    return []
  }
}

export const useWriteQueue = create<WriteQueueState>(() => ({
  items: loadItems(),
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  flushing: false,
  stalled: false,
}))

useWriteQueue.subscribe((state, previous) => {
  if (state.items === previous.items) return
  try {
    if (state.items.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // armazenamento cheio/indisponível: a fila continua valendo nesta sessão
  }
})

// --- Configuração (registrada pela store, para evitar dependência circular) ---

interface QueueConfig {
  anonKey: string
  getUserId: () => string | null
  getAccessToken: () => Promise<string | null>
  refreshAccessToken: () => Promise<string | null>
  onPermanentError: (error: WriteError) => void
}
let config: QueueConfig | null = null

export function configureWriteQueue(next: QueueConfig) {
  config = next
  void flushWriteQueue()
}

// --- Consultas do supabase-js ---

// Formato interno de uma consulta PostgREST do supabase-js (campos públicos em JS).
interface PostgrestLike {
  url: URL
  method: string
  headers: Headers
  body?: unknown
  schema?: string
  then: PromiseLike<unknown>['then']
}

export function isPostgrestQuery(value: unknown): value is PostgrestLike {
  const candidate = value as Partial<PostgrestLike> | null
  return Boolean(candidate && candidate.url instanceof URL && typeof candidate.method === 'string' && candidate.headers instanceof Headers)
}

function serialize(query: PostgrestLike): QueuedWrite {
  const headers: Record<string, string> = {}
  query.headers.forEach((value, key) => { headers[key] = value })
  // Os mesmos cabeçalhos que o supabase-js acrescenta na hora de enviar.
  if (query.method !== 'GET' && query.method !== 'HEAD') {
    headers['content-type'] = 'application/json'
    if (query.schema) headers['content-profile'] = query.schema
  }
  delete headers.authorization
  return {
    id: crypto.randomUUID(),
    userId: config?.getUserId() ?? null,
    method: query.method,
    url: query.url.toString(),
    headers,
    body: query.body === undefined ? undefined : JSON.stringify(query.body),
    createdAt: Date.now(),
  }
}

export interface WriteError {
  message?: string
  code?: string
  status?: number
  details?: string
}

// Falha de rede (sem resposta do servidor), e não erro do banco.
function isNetworkFailure(result: unknown): boolean {
  const response = result as { status?: number; error?: { code?: string } | null } | null
  return Boolean(response?.error && response.status === 0)
}

function enqueue(item: QueuedWrite, stalled = false) {
  useWriteQueue.setState((state) => ({ items: [...state.items, item], stalled: state.stalled || stalled }))
  scheduleRetry()
}

export interface WriteResult {
  error: WriteError | null
  queued?: boolean
}

// Envia uma escrita. Sem conexão (ou se já há escritas na fila, para manter a
// ordem), ela vai direto para a fila; se a rede falhar no envio, também.
export async function sendWrite(query: PostgrestLike): Promise<WriteResult> {
  const pendingBefore = useWriteQueue.getState().items.length > 0
  if (pendingBefore || !useWriteQueue.getState().online) {
    enqueue(serialize(query))
    void flushWriteQueue()
    return { error: null, queued: true }
  }
  const snapshot = serialize(query)
  try {
    const result = (await query) as { error?: WriteError | null; status?: number }
    if (isNetworkFailure(result)) {
      enqueue(snapshot, true)
      return { error: null, queued: true }
    }
    return { error: result?.error ? { ...result.error, status: result.status } : null }
  } catch {
    enqueue(snapshot, true)
    return { error: null, queued: true }
  }
}

// --- Reenvio ---

let retryTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRetry() {
  if (retryTimer || typeof window === 'undefined') return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void flushWriteQueue()
  }, RETRY_INTERVAL_MS)
}

async function send(item: QueuedWrite, token: string | null): Promise<Response> {
  return fetch(item.url, {
    method: item.method,
    headers: { ...item.headers, apikey: config!.anonKey, Authorization: `Bearer ${token ?? config!.anonKey}` },
    body: item.body,
  })
}

export async function flushWriteQueue(): Promise<void> {
  const state = useWriteQueue.getState()
  if (!config || state.flushing || !state.online || state.items.length === 0) return
  const userId = config.getUserId()
  if (!userId) return
  useWriteQueue.setState({ flushing: true })
  try {
    let token = await config.getAccessToken()
    while (true) {
      // Só reenvia o que foi feito pela conta logada agora.
      const item = useWriteQueue.getState().items.find((entry) => entry.userId === userId || entry.userId === null)
      if (!item) break
      let response: Response
      try {
        response = await send(item, token)
        if (response.status === 401) {
          token = await config.refreshAccessToken()
          response = await send(item, token)
        }
      } catch {
        // Ainda sem rede: tenta de novo mais tarde, sem perder a ordem.
        useWriteQueue.setState({ stalled: true })
        scheduleRetry()
        return
      }
      useWriteQueue.setState({ stalled: false })
      if (response.status === 401) {
        // Sessão expirada sem renovação: espera o login voltar a valer.
        scheduleRetry()
        return
      }
      useWriteQueue.setState((current) => ({ items: current.items.filter((entry) => entry.id !== item.id) }))
      // 409 = já existia (a escrita original chegou, só a resposta se perdeu).
      if (!response.ok && response.status !== 409) {
        const body = (await response.json().catch(() => null)) as WriteError | null
        config.onPermanentError({ ...body, status: response.status })
      }
    }
  } finally {
    useWriteQueue.setState({ flushing: false })
  }
}

// Mensagem para o usuário a partir do erro do banco.
export function describeWriteError(error: WriteError | null | undefined): string {
  const code = error?.code ?? ''
  if (error?.status === 401 || error?.status === 403 || code === '42501') return 'Você não tem permissão para fazer essa alteração (ou ela não é mais permitida).'
  if (code === '23505') return 'Esse item já existe.'
  if (code === '23503') return 'A alteração depende de um item que não existe mais (talvez tenha sido excluído).'
  if (code === '23514' || code === '22P02' || code === '23502') return 'Algum dado da alteração não é válido.'
  if (error?.status && error.status >= 500) return 'O servidor teve um problema ao salvar. Tente de novo em instantes.'
  return 'Não foi possível salvar a alteração. Recarregue o app e confira.'
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useWriteQueue.setState({ online: true })
    void flushWriteQueue()
  })
  window.addEventListener('offline', () => useWriteQueue.setState({ online: false }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushWriteQueue()
  })
}
