import { ListChecks, Paperclip, Plus, Table2 } from 'lucide-react'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { cn } from '@/lib/utils'

interface AddSubItemMenuProps {
  onSubtask: () => void
  onTable: () => void
  onAttachment: () => void
}

// Menu "Adicionar Sub-item" do detalhe da tarefa.
export function AddSubItemMenu({ onSubtask, onTable, onAttachment }: AddSubItemMenuProps) {
  return (
    <DropdownMenu
      label="Adicionar sub-item"
      renderTrigger={({ open, toggle }) => (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={toggle}
          className={cn('flex min-h-11 items-center gap-2 rounded-xl bg-surface px-3.5 text-sm font-semibold text-text-muted hover:text-accent', open && 'text-accent')}
        >
          <Plus size={16} /> Adicionar Sub-item
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem icon={<ListChecks size={14} />} label="Subtarefa" onClick={() => { close(); onSubtask() }} />
          <MenuItem icon={<Table2 size={14} />} label="Tabela" onClick={() => { close(); onTable() }} />
          <MenuItem icon={<Paperclip size={14} />} label="Anexo" onClick={() => { close(); onAttachment() }} />
        </>
      )}
    </DropdownMenu>
  )
}
