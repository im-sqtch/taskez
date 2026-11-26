import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

// Contexto passado pelos layouts de lista + detalhe (projetos e tarefas) para
// recolher a lista à esquerda no desktop e dar a largura toda ao detalhe.
export interface DetailListLayout {
  toggleList: () => void
  listCollapsed: boolean
  listName: 'projetos' | 'tarefas'
}

// Mesmo tamanho (h-10) dos demais botões redondos do cabeçalho do detalhe.
export function ListCollapseButton() {
  const layout = useOutletContext<DetailListLayout | undefined>()
  if (!layout?.toggleList) return null
  const label = `${layout.listCollapsed ? 'Expandir' : 'Recolher'} lista de ${layout.listName}`
  return (
    <button
      aria-label={label}
      title={label}
      onClick={layout.toggleList}
      className="hidden h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted hover:text-accent lg:flex"
    >
      {layout.listCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
    </button>
  )
}
