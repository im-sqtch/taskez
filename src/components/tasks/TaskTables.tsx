import { ArrowDown, ArrowUp, Check, Minus, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CopyableCell, TableCell, type TableContext } from '@/components/tasks/TableCells'
import { SelectOptionsSheet, TableColumnMenu } from '@/components/tasks/TableColumnMenu'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { cellText, columnType, columnTypeLabel, convertColumn, emptyCell, isEmptyCell, moveItem, type TableLookup } from '@/lib/taskTables'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { TableCellValue, TableColumn, TableColumnType, TaskTable } from '@/types'

export function TaskTables({ taskId, tables }: { taskId: string; tables: TaskTable[] }) {
  const updateTask = useDataStore((s) => s.updateTask)
  const workspaceId = useDataStore((s) => s.tasks.find((task) => task.id === taskId)?.workspaceId ?? s.currentWorkspaceId)
  const team = useDataStore((s) => s.team)
  const allFiles = useDataStore((s) => s.files)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [optionsTarget, setOptionsTarget] = useState<{ tableId: string; columnId: string } | null>(null)

  const context: TableContext = {
    taskId,
    workspaceId: workspaceId ?? '',
    members: team.filter((member) => member.workspaceId === workspaceId),
    files: allFiles.filter((file) => file.workspaceId === workspaceId && !file.deletedAt),
  }
  const lookup: TableLookup = context

  // Sempre parte das tabelas atuais da store: edições seguidas (ou depois de um
  // envio de arquivo) não podem sobrescrever umas às outras com dados antigos.
  function currentTables() {
    return useDataStore.getState().tasks.find((task) => task.id === taskId)?.tables ?? tables
  }

  function updateTable(id: string, change: (table: TaskTable) => TaskTable) {
    updateTask(taskId, { tables: currentTables().map((table) => (table.id === id ? change(table) : table)) })
  }

  function updateColumn(tableId: string, columnId: string, change: (column: TableColumn) => TableColumn) {
    updateTable(tableId, (table) => ({ ...table, columns: table.columns.map((column) => (column.id === columnId ? change(column) : column)) }))
  }

  function setCell(tableId: string, rowId: string, columnId: string, value: TableCellValue, nextColumn?: TableColumn) {
    updateTable(tableId, (table) => ({
      ...table,
      columns: nextColumn ? table.columns.map((column) => (column.id === columnId ? nextColumn : column)) : table.columns,
      rows: table.rows.map((row) => (row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row)),
    }))
  }

  function addColumn(table: TaskTable) {
    const id = crypto.randomUUID()
    updateTable(table.id, (current) => ({
      ...current,
      columns: [...current.columns, { id, title: `Coluna ${current.columns.length + 1}`, type: 'text' }],
      rows: current.rows.map((row) => ({ ...row, cells: { ...row.cells, [id]: '' } })),
    }))
  }

  function changeColumnType(table: TaskTable, column: TableColumn, type: TableColumnType) {
    const preview = convertColumn(table, column.id, type, lookup)
    const apply = () => updateTable(table.id, (current) => convertColumn(current, column.id, type, lookup).table)
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

  function deleteColumn(table: TaskTable, column: TableColumn) {
    const apply = () => updateTable(table.id, (current) => ({
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

  function deleteOption(tableId: string, columnId: string, optionId: string) {
    updateTable(tableId, (table) => ({
      ...table,
      columns: table.columns.map((column) => (column.id === columnId ? { ...column, options: (column.options ?? []).filter((option) => option.id !== optionId) } : column)),
      rows: table.rows.map((row) => {
        const value = row.cells[columnId]
        const next = Array.isArray(value) ? value.filter((id) => id !== optionId) : value === optionId ? '' : value
        return { ...row, cells: { ...row.cells, [columnId]: next ?? '' } }
      }),
    }))
  }

  function deleteTable(table: TaskTable) {
    confirmAction({
      title: 'Excluir tabela',
      description: `Excluir a tabela "${table.title?.trim() || 'Sem título'}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir tabela',
      danger: true,
      onConfirm: () => updateTask(taskId, { tables: currentTables().filter((item) => item.id !== table.id) }),
    })
  }

  const optionsTable = tables.find((table) => table.id === optionsTarget?.tableId)
  const optionsColumn = optionsTable?.columns.find((column) => column.id === optionsTarget?.columnId)

  return (
    <div className="flex flex-col gap-4">
      {tables.map((table, index) => {
        const isEditing = editingTableId === table.id
        return (
          <section key={table.id} className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Table2 size={16} className="shrink-0 text-text-faint" />
              {isEditing ? (
                <input
                  value={table.title ?? ''}
                  onChange={(event) => updateTable(table.id, (current) => ({ ...current, title: event.target.value }))}
                  placeholder={`Tabela ${index + 1} (título opcional)`}
                  aria-label="Título opcional da tabela"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text outline-none placeholder:font-normal placeholder:text-text-faint"
                />
              ) : (
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                  {table.title?.trim() || `Tabela ${index + 1}`}
                </p>
              )}
              {isEditing ? (
                <button
                  type="button"
                  aria-label="Concluir edição da tabela"
                  onClick={() => setEditingTableId(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-accent"
                >
                  <Check size={16} />
                </button>
              ) : (
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
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-accent"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      <MenuItem icon={<Pencil size={14} />} label="Editar tabela" onClick={() => { close(); setEditingTableId(table.id) }} />
                      <MenuItem icon={<Trash2 size={14} />} label="Excluir tabela" danger onClick={() => { close(); deleteTable(table) }} />
                    </>
                  )}
                </DropdownMenu>
              )}
            </div>
            <div className="overflow-x-auto rounded-b-2xl">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {table.columns.map((column, columnIndex) => (
                      <th key={column.id} className="min-w-36 border-b border-r border-border bg-surface-alt p-1.5 last:border-r-0">
                        <TableColumnMenu
                          column={column}
                          canMoveLeft={columnIndex > 0}
                          canMoveRight={columnIndex < table.columns.length - 1}
                          onRename={(title) => updateColumn(table.id, column.id, (current) => ({ ...current, title }))}
                          onChangeType={(type) => changeColumnType(table, column, type)}
                          onMove={(delta) => updateTable(table.id, (current) => {
                            const at = current.columns.findIndex((item) => item.id === column.id)
                            return { ...current, columns: moveItem(current.columns, at, delta) }
                          })}
                          onDelete={() => deleteColumn(table, column)}
                          onEditOptions={() => setOptionsTarget({ tableId: table.id, columnId: column.id })}
                        />
                      </th>
                    ))}
                    {isEditing && <th className="w-10 border-b border-border bg-surface-alt p-1">
                      <button onClick={() => addColumn(table)} aria-label="Adicionar coluna" className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-accent">
                        <Plus size={15} />
                      </button>
                    </th>}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={row.id}>
                      {table.columns.map((column) => (
                        <td key={column.id} className="border-b border-r border-border p-1 align-middle last:border-r-0">
                          <CopyableCell text={cellText(column, row.cells[column.id], lookup)}>
                            <TableCell
                              column={column}
                              value={row.cells[column.id] ?? emptyCell(columnType(column))}
                              context={context}
                              onChange={(value, nextColumn) => setCell(table.id, row.id, column.id, value, nextColumn)}
                            />
                          </CopyableCell>
                        </td>
                      ))}
                      {isEditing && <td className="border-b border-border p-1">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => updateTable(table.id, (current) => ({ ...current, rows: moveItem(current.rows, current.rows.findIndex((item) => item.id === row.id), -1) }))}
                            disabled={rowIndex === 0}
                            aria-label="Subir linha"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                          ><ArrowUp size={15} /></button>
                          <button
                            onClick={() => updateTable(table.id, (current) => ({ ...current, rows: moveItem(current.rows, current.rows.findIndex((item) => item.id === row.id), 1) }))}
                            disabled={rowIndex === table.rows.length - 1}
                            aria-label="Descer linha"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                          ><ArrowDown size={15} /></button>
                          <button onClick={() => updateTable(table.id, (current) => ({ ...current, rows: current.rows.filter((item) => item.id !== row.id) }))} aria-label="Excluir linha" className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger hover:bg-danger/20"><Minus size={15} /></button>
                        </div>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditing && <button
              onClick={() => updateTable(table.id, (current) => ({
                ...current,
                rows: [...current.rows, { id: crypto.randomUUID(), cells: Object.fromEntries(current.columns.map((column) => [column.id, emptyCell(columnType(column))])) }],
              }))}
              className="flex min-h-10 items-center gap-1.5 px-3 text-xs font-semibold text-accent"
            >
              <Plus size={14} /> Adicionar linha
            </button>}
          </section>
        )
      })}
      <SelectOptionsSheet
        column={optionsColumn}
        open={Boolean(optionsColumn)}
        onClose={() => setOptionsTarget(null)}
        onChange={(options) => optionsTarget && updateColumn(optionsTarget.tableId, optionsTarget.columnId, (column) => ({ ...column, options }))}
        onDeleteOption={(optionId) => optionsTarget && deleteOption(optionsTarget.tableId, optionsTarget.columnId, optionId)}
      />
    </div>
  )
}
