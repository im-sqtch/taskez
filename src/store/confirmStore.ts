import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  // Esconde o botão de cancelar — para avisos informativos (sucesso/erro de
  // uma ação que já aconteceu) em vez de uma decisão de fato com duas saídas.
  hideCancel?: boolean
  // Trava o botão de confirmar até o usuário digitar exatamente este texto
  // (ex.: o nome do que está sendo excluído) — para ações destrutivas onde um
  // clique duplo/acidental teria consequência grande demais para um simples
  // Cancelar/Confirmar.
  confirmText?: string
}

interface ConfirmState {
  options: ConfirmOptions | null
  close: () => void
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  options: null,
  close: () => set({ options: null }),
}))

// Substitui o `window.confirm()` nativo (visual padrão do navegador) por um
// diálogo com o design do app — ver <ConfirmDialog />, montado uma vez no AppShell.
export function confirmAction(options: ConfirmOptions) {
  useConfirmStore.setState({ options })
}
