import { ListChecks, Paperclip, Plus, Table2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AddSubItemMenuProps {
  onSubtask: () => void
  onTable: () => void
  onAttachment: () => void
}

// Menu "Adicionar Sub-item" do detalhe da tarefa. Abre para baixo, no mesmo
// visual do WorkspaceDropdown, e fecha ao clicar fora ou com Esc.
export function AddSubItemMenu({ onSubtask, onTable, onAttachment }: AddSubItemMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // O botão costuma ficar perto do fim do painel: rola só o necessário para
    // o menu aparecer inteiro.
    menuRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
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

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={cn('flex min-h-11 items-center gap-2 rounded-xl bg-surface px-3.5 text-sm font-semibold text-text-muted hover:text-accent', open && 'text-accent')}
      >
        <Plus size={16} /> Adicionar Sub-item
      </button>
      {open && (
        <div ref={menuRef} role="menu" className="absolute left-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
          <MenuItem icon={<ListChecks size={14} />} label="Subtarefa" onClick={() => run(onSubtask)} />
          <MenuItem icon={<Table2 size={14} />} label="Tabela" onClick={() => run(onTable)} />
          <MenuItem icon={<Paperclip size={14} />} label="Anexo" onClick={() => run(onAttachment)} />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-text transition-colors hover:bg-surface-alt hover:text-accent"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}
