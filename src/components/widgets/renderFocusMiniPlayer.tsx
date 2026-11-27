import { createRoot } from 'react-dom/client'
import { FocusMiniPlayer } from './FocusMiniPlayer'

// Monta o mini painel no documento da janela flutuante; devolve como desmontar.
export function renderFocusMiniPlayer(pipWindow: Window): () => void {
  const container = pipWindow.document.createElement('div')
  pipWindow.document.body.style.margin = '0'
  pipWindow.document.body.appendChild(container)
  const root = createRoot(container)
  root.render(<FocusMiniPlayer />)
  return () => root.unmount()
}
