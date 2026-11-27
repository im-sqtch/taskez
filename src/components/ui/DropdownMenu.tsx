import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  // Nome do menu para leitores de tela.
  label: string
  // Lado em que o painel se alinha ao botão.
  align?: 'left' | 'right'
  // Botão que abre o menu; recebe o estado e a função de abrir/fechar.
  renderTrigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  // Itens do menu; `close` fecha o menu (útil para quem precisa adiar o fechamento).
  children: (close: () => void) => ReactNode
}

// Menu suspenso padrão do TaskEz (ver DESIGN.md, "Menus suspensos"): abre para
// baixo, painel `rounded-2xl bg-surface`, fecha ao clicar fora ou com Esc.
export function DropdownMenu({ label, align = 'left', renderTrigger, children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // O botão costuma ficar perto do fim do painel: rola só o necessário para
    // o menu aparecer inteiro.
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-block">
      {renderTrigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          className={cn('absolute top-full z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg', align === 'right' ? 'right-0' : 'left-0')}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: ReactNode
  label: ReactNode
  onClick: () => void
  danger?: boolean
}

// Item de menu: ícone num quadradinho `rounded-lg bg-surface-alt` + texto semibold.
export function MenuItem({ icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-text hover:bg-surface-alt hover:text-accent',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}
