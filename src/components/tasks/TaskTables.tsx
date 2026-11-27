import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowDown, ArrowUp, BetweenHorizontalStart, CopyPlus, GripVertical, MoreHorizontal, Plus, Trash2, WrapText } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { CopyableCell, TableCell, type TableContext } from '@/components/tasks/TableCells'
import { SelectOptionsSheet, TableColumnMenu } from '@/components/tasks/TableColumnMenu'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { cellText, columnType, columnTypeLabel, convertColumn, emptyCell, isEmptyCell, moveItem, type TableLookup } from '@/lib/taskTables'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { TableCellValue, TableColumn, TableColumnType, TaskTable } from '@/types'

// Medidas (px): alça das linhas à esquerda, botão "+" de coluna à direita e
// largura das colunas (padrão, mínima e máxima ao redimensionar).
const GUTTER_WIDTH = 28
const ADD_COLUMN_WIDTH = 44
const DEFAULT_COLUMN_WIDTH = 176
const MIN_COLUMN_WIDTH = 90
const MAX_COLUMN_WIDTH = 640

// Alça de arraste entregue pelas linhas e cabeçalhos ordenáveis.
interface DragHandle {
  ref: (element: HTMLElement | null) => void
  props: Record<string, unknown>
  isDragging: boolean
}
type Row = TaskTable['rows'][number]

// Tabelas das tarefas, no estilo do Notion: sem caixa em volta, só linhas
// horizontais e divisórias suaves entre colunas. Tudo se edita direto, sem
// modo edição: arraste a alça da linha ou o cabeçalho da coluna para reordenar,
// e a borda direita do cabeçalho para mudar a largura.
export function TaskTables({ taskId, tables }: { taskId: string; tables: TaskTable[] }) {
  const updateTask = useDataStore((s) => s.updateTask)
  const workspaceId = useDataStore((s) => s.tasks.find((task) => task.id === taskId)?.workspaceId ?? s.currentWorkspaceId)
  const team = useDataStore((s) => s.team)
  const allFiles = useDataStore((s) => s.files)
  const [optionsTarget, setOptionsTarget] = useState<{ tableId: string; columnId: string } | null>(null)

  const context: TableContext = {
    taskId,
    workspaceId: workspaceId ?? '',
    members: team.filter((member) => member.workspaceId === workspaceId),
    files: allFiles.filter((file) => file.workspaceId === workspaceId && !file.deletedAt),
  }

  // Sempre parte das tabelas atuais da store: edições seguidas (ou depois de um
  // envio de arquivo) não podem sobrescrever umas às outras com dados antigos.
  function currentTables() {
    return useDataStore.getState().tasks.find((task) => task.id === taskId)?.tables ?? tables
  }

  function updateTable(id: string, change: (table: TaskTable) => TaskTable) {
    updateTask(taskId, { tables: currentTables().map((table) => (table.id === id ? change(table) : table)) })
  }

  function deleteTable(table: TaskTable, index: number) {
    confirmAction({
      title: 'Excluir tabela',
      description: `Excluir a tabela "${table.title?.trim() || `Tabela ${index + 1}`}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir tabela',
      danger: true,
      onConfirm: () => updateTask(taskId, { tables: currentTables().filter((item) => item.id !== table.id) }),
    })
  }

  const optionsTable = tables.find((table) => table.id === optionsTarget?.tableId)
  const optionsColumn = optionsTable?.columns.find((column) => column.id === optionsTarget?.columnId)

  return (
    <div className="flex flex-col gap-6">
      {tables.map((table, index) => (
        <TableBlock
          key={table.id}
          table={table}
          index={index}
          context={context}
          update={(change) => updateTable(table.id, change)}
          onDelete={() => deleteTable(table, index)}
          onEditOptions={(columnId) => setOptionsTarget({ tableId: table.id, columnId })}
        />
      ))}
      <SelectOptionsSheet
        column={optionsColumn}
        open={Boolean(optionsColumn)}
        onClose={() => setOptionsTarget(null)}
        onChange={(options) => optionsTarget && updateTable(optionsTarget.tableId, (table) => ({
          ...table,
          columns: table.columns.map((column) => (column.id === optionsTarget.columnId ? { ...column, options } : column)),
        }))}
        onDeleteOption={(optionId) => optionsTarget && updateTable(optionsTarget.tableId, (table) => ({
          ...table,
          columns: table.columns.map((column) => (column.id === optionsTarget.columnId ? { ...column, options: (column.options ?? []).filter((option) => option.id !== optionId) } : column)),
          rows: table.rows.map((row) => {
            const value = row.cells[optionsTarget.columnId]
            const next = Array.isArray(value) ? value.filter((id) => id !== optionId) : value === optionId ? '' : value
            return { ...row, cells: { ...row.cells, [optionsTarget.columnId]: next ?? '' } }
          }),
        }))}
      />
    </div>
  )
}

interface TableBlockProps {
  table: TaskTable
  index: number
  context: TableContext
  update: (change: (table: TaskTable) => TaskTable) => void
  onDelete: () => void
  onEditOptions: (columnId: string) => void
}

function reorder<T extends { id: string }>(list: T[], { active, over }: DragEndEvent): T[] {
  if (!over || active.id === over.id) return list
  const from = list.findIndex((item) => item.id === active.id)
  const to = list.findIndex((item) => item.id === over.id)
  if (from < 0 || to < 0) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  return next
}

function TableBlock({ table, index, context, update, onDelete, onEditOptions }: TableBlockProps) {
  const lookup: TableLookup = context
  const wrap = Boolean(table.wrap)
  // Largura provisória enquanto a borda de uma coluna é arrastada.
  const [resizing, setResizing] = useState<{ columnId: string; width: number } | null>(null)
  // Depois de soltar um arraste, o clique que vem junto não deve abrir o menu.
  const suppressClick = useRef(false)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  const widthOf = (column: TableColumn) => (resizing?.columnId === column.id ? resizing.width : column.width ?? DEFAULT_COLUMN_WIDTH)
  const tableWidth = GUTTER_WIDTH + table.columns.reduce((sum, column) => sum + widthOf(column), 0) + ADD_COLUMN_WIDTH

  function newColumn(title: string): TableColumn {
    return { id: crypto.randomUUID(), title, type: 'text' }
  }

  function newRow(columns: TableColumn[]): Row {
    return { id: crypto.randomUUID(), cells: Object.fromEntries(columns.map((column) => [column.id, emptyCell(columnType(column))])) }
  }

  function setCell(rowId: string, columnId: string, value: TableCellValue, nextColumn?: TableColumn) {
    update((current) => ({
      ...current,
      columns: nextColumn ? current.columns.map((column) => (column.id === columnId ? nextColumn : column)) : current.columns,
      rows: current.rows.map((row) => (row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row)),
    }))
  }

  function updateColumn(columnId: string, change: (column: TableColumn) => TableColumn) {
    update((current) => ({ ...current, columns: current.columns.map((column) => (column.id === columnId ? change(column) : column)) }))
  }

  function insertColumn(at: number, column: TableColumn, values?: (row: Row) => TableCellValue) {
    update((current) => {
      const columns = [...current.columns]
      columns.splice(at, 0, column)
      return {
        ...current,
        columns,
        rows: current.rows.map((row) => ({ ...row, cells: { ...row.cells, [column.id]: values ? values(row) : emptyCell(columnType(column)) } })),
      }
    })
  }

  function insertRow(rowId: string, side: -1 | 1, make: (current: TaskTable, at: number) => Row) {
    update((current) => {
      const at = current.rows.findIndex((item) => item.id === rowId)
      const rows = [...current.rows]
      rows.splice(at + (side === 1 ? 1 : 0), 0, make(current, at))
      return { ...current, rows }
    })
  }

  function changeColumnType(column: TableColumn, type: TableColumnType) {
    const preview = convertColumn(table, column.id, type, lookup)
    const apply = () => update((current) => convertColumn(current, column.id, type, lookup).table)
    if (preview.lost === 0) {
      apply()
      return
    }
    confirmAction({
      title: 'Trocar tipo da coluna',
      description: preview.lost === 1
        ? `1 valor de "${column.title}" não pode ser convertido para ${columnTypeLabel(type)} e será apagado ou ficará incompleto.`
        : `${preview.lost} valores de "${column.title}" não podem ser convertidos para ${columnTypeLabel(type)} e serão apagados ou ficarão incompletos.`,
      confirmLabel: 'Trocar tipo',
      danger: true,
      onConfirm: apply,
    })
  }

  function deleteColumn(column: TableColumn) {
    const apply = () => update((current) => ({
      ...current,
      columns: current.columns.filter((item) => item.id !== column.id),
      rows: current.rows.map((row) => { const { [column.id]: _removed, ...cells } = row.cells; return { ...row, cells } }),
    }))
    if (table.rows.every((row) => isEmptyCell(row.cells[column.id]))) {
      apply()
      return
    }
    confirmAction({
      title: 'Excluir coluna',
      description: `Excluir a coluna "${column.title || 'Sem nome'}" e todos os valores dela?`,
      confirmLabel: 'Excluir coluna',
      danger: true,
      onConfirm: apply,
    })
  }

  function startResize(event: React.PointerEvent, column: TableColumn) {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = widthOf(column)
    let width = startWidth
    function move(moveEvent: PointerEvent) {
      width = Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX)))
      setResizing({ columnId: column.id, width })
    }
    function end() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setResizing(null)
      if (width !== startWidth) updateColumn(column.id, (current) => ({ ...current, width }))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  function endDrag() {
    // O clique que segue o "soltar" chega logo depois; libera no próximo ciclo.
    window.setTimeout(() => { suppressClick.current = false }, 0)
  }

  const blockClickAfterDrag = (event: React.MouseEvent) => {
    if (!suppressClick.current) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center gap-1" style={{ paddingLeft: GUTTER_WIDTH }}>
        <input
          value={table.title ?? ''}
          onChange={(event) => update((current) => ({ ...current, title: event.target.value }))}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur() }}
          placeholder={`Tabela ${index + 1}`}
          aria-label="Título da tabela"
          className="min-h-9 min-w-0 flex-1 bg-transparent text-base font-bold text-text outline-none placeholder:text-text-faint"
        />
        <DropdownMenu
          label="Opções da tabela"
          align="right"
          renderTrigger={({ open, toggle }) => (
            <button
              type="button"
              aria-label="Opções da tabela"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={toggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<WrapText size={14} />}
                label={wrap ? 'Quebrar texto: ativado' : 'Quebrar texto: desativado'}
                selected={wrap}
                onClick={() => update((current) => ({ ...current, wrap: !current.wrap }))}
              />
              <MenuItem icon={<Trash2 size={14} />} label="Excluir tabela" danger onClick={() => { close(); onDelete() }} />
            </>
          )}
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto pb-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => { suppressClick.current = true }}
          onDragCancel={endDrag}
          onDragEnd={(event) => {
            endDrag()
            if (event.active.data.current?.kind === 'column') update((current) => ({ ...current, columns: reorder(current.columns, event) }))
            else update((current) => ({ ...current, rows: reorder(current.rows, event) }))
          }}
        >
          <table className="table-fixed border-collapse text-left text-sm" style={{ width: tableWidth }}>
            <thead>
              <SortableContext items={table.columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
                <tr>
                  <th style={{ width: GUTTER_WIDTH }} className="p-0" aria-hidden />
                  {table.columns.map((column, columnIndex) => (
                    <SortableHeader key={column.id} id={column.id} width={widthOf(column)} onClickCapture={blockClickAfterDrag}>
                      {(drag) => (
                        <>
                          <TableColumnMenu
                            column={column}
                            canMoveLeft={columnIndex > 0}
                            canMoveRight={columnIndex < table.columns.length - 1}
                            dragHandle={drag}
                            onRename={(title) => updateColumn(column.id, (current) => ({ ...current, title }))}
                            onChangeType={(type) => changeColumnType(column, type)}
                            onMove={(delta) => update((current) => ({ ...current, columns: moveItem(current.columns, current.columns.findIndex((item) => item.id === column.id), delta) }))}
                            onInsert={(side) => insertColumn(columnIndex + (side === 1 ? 1 : 0), newColumn(`Coluna ${table.columns.length + 1}`))}
                            onDuplicate={() => insertColumn(
                              columnIndex + 1,
                              { ...column, id: crypto.randomUUID(), title: `${column.title} (cópia)` },
                              (row) => structuredClone(row.cells[column.id] ?? emptyCell(columnType(column))),
                            )}
                            onDelete={() => deleteColumn(column)}
                            onEditOptions={() => onEditOptions(column.id)}
                          />
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={`Redimensionar coluna ${column.title}`}
                            onPointerDown={(event) => startResize(event, column)}
                            className="group/resize absolute -right-1 top-0 z-10 flex h-full w-2 cursor-col-resize touch-none justify-center"
                          >
                            <span className={cn('h-full w-0.5 transition-colors group-hover/resize:bg-accent', resizing?.columnId === column.id && 'bg-accent')} />
                          </div>
                        </>
                      )}
                    </SortableHeader>
                  ))}
                  <th style={{ width: ADD_COLUMN_WIDTH }} className="border-b border-border-soft p-0">
                    <button
                      type="button"
                      onClick={() => insertColumn(table.columns.length, newColumn(`Coluna ${table.columns.length + 1}`))}
                      aria-label="Adicionar coluna"
                      title="Adicionar coluna"
                      className="flex min-h-11 w-full items-center justify-center text-text-faint transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent lg:min-h-9"
                    >
                      <Plus size={16} />
                    </button>
                  </th>
                </tr>
              </SortableContext>
            </thead>
            <tbody>
              <SortableContext items={table.rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                {table.rows.map((row, rowIndex) => (
                  <SortableRow key={row.id} id={row.id}>
                    {(drag) => (
                      <>
                        <td className="p-0 align-middle" onClickCapture={blockClickAfterDrag}>
                          <RowMenu
                            drag={drag}
                            isFirst={rowIndex === 0}
                            isLast={rowIndex === table.rows.length - 1}
                            onInsert={(side) => insertRow(row.id, side, (current) => newRow(current.columns))}
                            onDuplicate={() => insertRow(row.id, 1, (current, at) => ({ id: crypto.randomUUID(), cells: structuredClone(current.rows[at]!.cells) }))}
                            onMove={(delta) => update((current) => ({ ...current, rows: moveItem(current.rows, current.rows.findIndex((item) => item.id === row.id), delta) }))}
                            onDelete={() => update((current) => ({ ...current, rows: current.rows.filter((item) => item.id !== row.id) }))}
                          />
                        </td>
                        {table.columns.map((column) => (
                          <td key={column.id} className={cn('h-px border-b border-r border-border-soft p-0', wrap ? 'align-top' : 'align-middle')}>
                            <CopyableCell text={cellText(column, row.cells[column.id], lookup)}>
                              <TableCell
                                column={column}
                                value={row.cells[column.id] ?? emptyCell(columnType(column))}
                                context={context}
                                onChange={(value, nextColumn) => setCell(row.id, column.id, value, nextColumn)}
                                wrap={wrap}
                              />
                            </CopyableCell>
                          </td>
                        ))}
                        <td className="border-b border-border-soft p-0" />
                      </>
                    )}
                  </SortableRow>
                ))}
              </SortableContext>
            </tbody>
            <tfoot>
              <tr>
                <td className="p-0" />
                <td colSpan={table.columns.length + 1} className="p-0">
                  <button
                    type="button"
                    onClick={() => update((current) => ({ ...current, rows: [...current.rows, newRow(current.columns)] }))}
                    className="flex min-h-11 w-full items-center gap-1.5 px-2 text-left text-sm text-text-faint transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent lg:min-h-9"
                  >
                    <Plus size={15} /> Nova linha
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </DndContext>
      </div>
    </section>
  )
}

function SortableHeader({ id, width, onClickCapture, children }: { id: string; width: number; onClickCapture: (event: React.MouseEvent) => void; children: (handle: DragHandle) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { kind: 'column' } })
  return (
    <th
      ref={setNodeRef}
      onClickCapture={onClickCapture}
      style={{ width, transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined, transition }}
      className={cn('relative border-b border-r border-border-soft p-0 text-left font-normal', isDragging && 'z-20 bg-surface opacity-90 shadow-lg')}
    >
      {children({ ref: setActivatorNodeRef, props: { ...attributes, ...listeners }, isDragging })}
    </th>
  )
}

function SortableRow({ id, children }: { id: string; children: (handle: DragHandle) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { kind: 'row' } })
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined, transition }}
      className={cn('group/row', isDragging && 'relative z-20 bg-surface opacity-90 shadow-lg')}
    >
      {children({ ref: setActivatorNodeRef, props: { ...attributes, ...listeners }, isDragging })}
    </tr>
  )
}

// Alça da linha (aparece ao passar o mouse; sempre visível no toque):
// arraste para reordenar, clique para abrir o menu da linha.
function RowMenu({ drag, isFirst, isLast, onInsert, onDuplicate, onMove, onDelete }: {
  drag: DragHandle
  isFirst: boolean
  isLast: boolean
  onInsert: (side: -1 | 1) => void
  onDuplicate: () => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu
      label="Opções da linha"
      renderTrigger={({ open, toggle }) => (
        <button
          ref={drag.ref}
          {...drag.props}
          type="button"
          onClick={toggle}
          aria-label="Opções da linha"
          title="Clique para abrir o menu · arraste para mover"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded-md text-text-faint transition-opacity hover:text-text focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing',
            'opacity-0 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100',
            (open || drag.isDragging) && 'opacity-100',
          )}
        >
          <GripVertical size={15} />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem icon={<BetweenHorizontalStart size={14} />} label="Inserir acima" onClick={() => { close(); onInsert(-1) }} />
          <MenuItem icon={<BetweenHorizontalStart size={14} className="rotate-180" />} label="Inserir abaixo" onClick={() => { close(); onInsert(1) }} />
          <MenuItem icon={<CopyPlus size={14} />} label="Duplicar linha" onClick={() => { close(); onDuplicate() }} />
          {!isFirst && <MenuItem icon={<ArrowUp size={14} />} label="Mover para cima" onClick={() => { close(); onMove(-1) }} />}
          {!isLast && <MenuItem icon={<ArrowDown size={14} />} label="Mover para baixo" onClick={() => { close(); onMove(1) }} />}
          <MenuItem icon={<Trash2 size={14} />} label="Excluir linha" danger onClick={() => { close(); onDelete() }} />
        </>
      )}
    </DropdownMenu>
  )
}
