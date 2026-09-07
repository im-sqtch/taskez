import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
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
