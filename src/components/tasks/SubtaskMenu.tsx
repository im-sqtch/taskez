import { Check, Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SubtaskMenuProps {
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

// Menu de "..." de uma subtarefa: copiar (com quebra de linha), editar, apagar.
// Fecha ao clicar fora ou Esc, mesmo padrão do WorkspaceDropdown.
export function SubtaskMenu({ onCopy, onEdit, onDelete }: SubtaskMenuProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setOpen(false)
    }, 900)
  }

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais opções"
        className={cn('flex h-7 w-7 items-center justify-center rounded-full text-text-faint hover:text-text-muted', open && 'text-text-muted')}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <button onClick={handleCopy} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text hover:bg-surface-alt">
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button onClick={() => run(onEdit)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text hover:bg-surface-alt">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => run(onDelete)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-soft">
            <Trash2 size={14} /> Apagar
          </button>
        </div>
      )}
    </div>
  )
}
