import { Check, Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { cn } from '@/lib/utils'

interface SubtaskMenuProps {
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

// Menu de "..." de uma subtarefa: copiar (com quebra de linha), editar, apagar.
export function SubtaskMenu({ onCopy, onEdit, onDelete }: SubtaskMenuProps) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="shrink-0">
      <DropdownMenu
        label="Opções da subtarefa"
        align="right"
        renderTrigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={open}
            className={cn('flex h-7 w-7 items-center justify-center rounded-full text-text-faint hover:text-text-muted', open && 'text-text-muted')}
          >
            <MoreVertical size={15} />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem
              icon={copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              label={copied ? 'Copiado!' : 'Copiar'}
              onClick={() => {
                onCopy()
                setCopied(true)
                // Mantém o menu aberto um instante para mostrar o "Copiado!".
                setTimeout(() => {
                  setCopied(false)
                  close()
                }, 900)
              }}
            />
            <MenuItem icon={<Pencil size={14} />} label="Editar" onClick={() => { close(); onEdit() }} />
            <MenuItem icon={<Trash2 size={14} />} label="Apagar" danger onClick={() => { close(); onDelete() }} />
          </>
        )}
      </DropdownMenu>
    </div>
  )
}
