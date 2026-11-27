import { CloudOff, RefreshCw } from 'lucide-react'
import { useWriteQueue } from '@/lib/writeQueue'

// Aviso discreto no topo quando o app está sem conexão ou ainda enviando
// alterações feitas offline (ver lib/writeQueue). Some quando está tudo salvo.
export function SyncStatus() {
  const online = useWriteQueue((s) => s.online)
  const pending = useWriteQueue((s) => s.items.length)
  const stalled = useWriteQueue((s) => s.stalled)
  if (online && pending === 0) return null

  const count = pending === 1 ? '1 alteração' : `${pending} alterações`
  const text = !online
    ? pending > 0
      ? `Sem conexão · ${count} ${pending === 1 ? 'será enviada' : 'serão enviadas'} quando voltar`
      : 'Sem conexão · o que você alterar fica guardado neste aparelho'
    : stalled
      ? `Sem resposta do servidor · ${count} aguardando envio`
      : `Enviando ${count}…`

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+8px)] z-[60] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text shadow-lg"
    >
      {online && !stalled ? <RefreshCw size={14} className="shrink-0 animate-spin text-accent" aria-hidden="true" /> : <CloudOff size={14} className="shrink-0 text-warning" aria-hidden="true" />}
      <span className="truncate">{text}</span>
    </div>
  )
}
