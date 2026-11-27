import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  // Nome do menu para leitores de tela.
  label: string
  // Lado em que o painel se alinha ao botão.
  align?: 'left' | 'right'
  // 'full': o botão e o painel ocupam a largura toda (seletor tipo campo).
  width?: 'auto' | 'full'
  // Botão que abre o menu; recebe o estado e a função de abrir/fechar.
  renderTrigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  // Itens do menu; `close` fecha o menu (útil para quem precisa adiar o fechamento).
  children: (close: () => void) => ReactNode
}

const PANEL_WIDTH = 240
const MAX_PANEL_HEIGHT = 288
const GAP = 8
// Espaço mínimo abaixo do botão; com menos que isso, a página rola antes de abrir.
const MIN_SPACE_BELOW = 260

// No celular a barra de navegação fixa cobre o fim da tela.
function bottomReserve() {
  return window.matchMedia('(min-width: 1024px)').matches ? GAP : 104
}

// Menu suspenso padrão do TaskEz (ver DESIGN.md, "Menus suspensos"): abre para
// baixo, painel `rounded-2xl bg-surface`, fecha ao clicar fora ou com Esc.
// O painel é desenhado por cima de tudo (portal, posição fixa), para não ser
// cortado por cards ou painéis com rolagem própria.
export function DropdownMenu({ label, align = 'left', width = 'auto', renderTrigger, children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)

  function place() {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = width === 'full' ? rect.width : PANEL_WIDTH
    const left = width === 'full' ? rect.left : align === 'right' ? rect.right - panelWidth : rect.left
    const spaceBelow = window.innerHeight - bottomReserve() - rect.bottom - GAP
    const spaceAbove = rect.top - GAP * 2
    // Abre para baixo; só abre para cima quando não cabe embaixo nem rolando
    // (ex.: fim da página no celular) e há mais espaço em cima.
    const above = spaceBelow < MIN_SPACE_BELOW && spaceAbove > spaceBelow
    setPosition({
      top: above ? undefined : rect.bottom + GAP,
      bottom: above ? window.innerHeight - rect.top + GAP : undefined,
      left: Math.max(GAP, Math.min(left, window.innerWidth - panelWidth - GAP)),
      width: panelWidth,
      maxHeight: Math.max(120, Math.min(MAX_PANEL_HEIGHT, above ? spaceAbove : spaceBelow)),
    })
  }

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    // Perto do fim da tela: rola o botão para cima para o menu caber abaixo dele.
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect && window.innerHeight - bottomReserve() - rect.bottom < MIN_SPACE_BELOW) rootRef.current?.scrollIntoView({ block: 'center' })
    place()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function handleScroll(event: Event) {
      if (panelRef.current?.contains(event.target as Node)) return
      place()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', place)
    }
    // place só lê refs e props estáveis durante o menu aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', width === 'full' ? 'block w-full' : 'inline-block')}>
      {renderTrigger({ open, toggle })}
      {open && position && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          className="fixed z-50 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
          style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width, maxHeight: position.maxHeight }}
        >
          {children(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: ReactNode
  label: ReactNode
  onClick: () => void
  danger?: boolean
  // Opção atualmente escolhida (seletores): destaque roxo.
  selected?: boolean
}

// Item de menu: ícone num quadradinho `rounded-lg bg-surface-alt` + texto semibold.
export function MenuItem({ icon, label, onClick, danger, selected }: MenuItemProps) {
  return (
    <button
      type="button"
      role={selected === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent',
        danger ? 'text-danger hover:bg-danger-soft' : selected ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-alt hover:text-accent',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt">{icon}</span>
      <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
    </button>
  )
}
