import {
  ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight, CircleCheck, CircleDollarSign, Hash, Link2, List, Paperclip, Plus, Tags, Trash2, Type, User, Wallet, type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { Sheet } from '@/components/ui/Sheet'
import { COLUMN_TYPES, OPTION_COLORS, columnType, columnTypeLabel } from '@/lib/taskTables'
import type { TableColumn, TableColumnType, TableSelectOption } from '@/types'

const COLUMN_ICONS: Record<TableColumnType, LucideIcon> = {
  text: Type,
  number: Hash,
  usd: CircleDollarSign,
  brl: Wallet,
  select: List,
  multiSelect: Tags,
  date: Calendar,
  person: User,
  files: Paperclip,
  checkbox: CircleCheck,
  link: Link2,
}

interface TableColumnMenuProps {
  column: TableColumn
  canMoveLeft: boolean
  canMoveRight: boolean
  onRename: (title: string) => void
  onChangeType: (type: TableColumnType) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
  onEditOptions: () => void
}

// Cabeçalho da coluna: ao clicar, abre o menu para renomear, trocar o tipo,
// mover e excluir a coluna.
export function TableColumnMenu({ column, canMoveLeft, canMoveRight, onRename, onChangeType, onMove, onDelete, onEditOptions }: TableColumnMenuProps) {
  const type = columnType(column)
  const Icon = COLUMN_ICONS[type]
  return (
    <DropdownMenu
      label={`Coluna ${column.title}`}
      blockTrigger
      renderTrigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Opções da coluna ${column.title || 'sem nome'}`}
          className="flex min-h-11 w-full items-center gap-1.5 px-2.5 text-left text-xs font-bold text-text hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Icon size={13} className="shrink-0 text-text-faint" />
          <span className="min-w-0 flex-1 truncate">{column.title || 'Sem nome'}</span>
        </button>
      )}
    >
      {(close) => (
        <ColumnMenuPanel
          column={column}
          canMoveLeft={canMoveLeft}
          canMoveRight={canMoveRight}
          onRename={onRename}
          onChangeType={(next) => { close(); onChangeType(next) }}
          onMove={onMove}
          onDelete={() => { close(); onDelete() }}
          onEditOptions={() => { close(); onEditOptions() }}
          onDone={close}
        />
      )}
    </DropdownMenu>
  )
}

function ColumnMenuPanel({ column, canMoveLeft, canMoveRight, onRename, onChangeType, onMove, onDelete, onEditOptions, onDone }: TableColumnMenuProps & { onDone: () => void }) {
  const [view, setView] = useState<'main' | 'type'>('main')
  const type = columnType(column)
  const TypeIcon = COLUMN_ICONS[type]

  if (view === 'type') {
    return (
      <>
        <MenuItem icon={<ChevronLeft size={14} />} label="Voltar" onClick={() => setView('main')} />
        {COLUMN_TYPES.map((item) => {
          const ItemIcon = COLUMN_ICONS[item.type]
          return <MenuItem key={item.type} icon={<ItemIcon size={14} />} label={item.label} selected={item.type === type} onClick={() => onChangeType(item.type)} />
        })}
      </>
    )
  }

  return (
    <>
      <input
        value={column.title}
        onChange={(event) => onRename(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') onDone() }}
        placeholder="Nome da coluna"
        aria-label="Nome da coluna"
        className="mb-1 h-10 w-full rounded-xl border border-border bg-base px-3 text-sm font-semibold text-text outline-none placeholder:font-normal placeholder:text-text-faint focus:border-accent"
      />
      <MenuItem
        icon={<TypeIcon size={14} />}
        label={<span className="flex items-center gap-1">Tipo: {columnTypeLabel(type)} <ChevronRight size={14} className="text-text-faint" /></span>}
        onClick={() => setView('type')}
      />
      {(type === 'select' || type === 'multiSelect') && <MenuItem icon={<List size={14} />} label="Editar opções" onClick={onEditOptions} />}
      {canMoveLeft && <MenuItem icon={<ArrowLeft size={14} />} label="Mover para a esquerda" onClick={() => onMove(-1)} />}
      {canMoveRight && <MenuItem icon={<ArrowRight size={14} />} label="Mover para a direita" onClick={() => onMove(1)} />}
      <MenuItem icon={<Trash2 size={14} />} label="Excluir coluna" danger onClick={onDelete} />
    </>
  )
}

// Sheet para renomear, trocar a cor e excluir as opções de um select.
export function SelectOptionsSheet({ column, open, onClose, onChange, onDeleteOption }: {
  column: TableColumn | undefined
  open: boolean
  onClose: () => void
  onChange: (options: TableSelectOption[]) => void
  onDeleteOption: (optionId: string) => void
}) {
  const options = column?.options ?? []
  const update = (id: string, patch: Partial<TableSelectOption>) => onChange(options.map((option) => (option.id === id ? { ...option, ...patch } : option)))
  return (
    <Sheet open={open} onClose={onClose} title="Editar opções" subtitle={column?.title}>
      <div className="flex flex-col gap-2">
        {options.length === 0 && <p className="py-2 text-sm text-text-muted">Nenhuma opção ainda. Crie a primeira abaixo ou direto na célula.</p>}
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2 rounded-xl bg-surface p-2">
            <DropdownMenu
              label="Cor da opção"
              renderTrigger={({ open: menuOpen, toggle }) => (
                <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Cor de ${option.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-alt">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: option.color }} />
                </button>
              )}
            >
              {(close) => OPTION_COLORS.map((item) => (
                <MenuItem
                  key={item.color}
                  icon={<span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />}
                  label={item.name}
                  selected={item.color === option.color}
                  onClick={() => { update(option.id, { color: item.color }); close() }}
                />
              ))}
            </DropdownMenu>
            <input
              value={option.name}
              onChange={(event) => update(option.id, { name: event.target.value })}
              aria-label="Nome da opção"
              className="h-10 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-sm text-text outline-none focus:bg-base"
            />
            <button type="button" onClick={() => onDeleteOption(option.id)} aria-label={`Excluir opção ${option.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-danger">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...options, { id: crypto.randomUUID(), name: `Opção ${options.length + 1}`, color: OPTION_COLORS[options.length % OPTION_COLORS.length]!.color }])}
          className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-accent hover:bg-surface"
        >
          <Plus size={15} /> Nova opção
        </button>
      </div>
    </Sheet>
  )
}
