import { Check, Minus, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { TaskTable } from '@/types'

export function TaskTables({ taskId, tables }: { taskId: string; tables: TaskTable[] }) {
  const updateTask = useDataStore((s) => s.updateTask)
  const [menuTableId, setMenuTableId] = useState<string | null>(null)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const save = (next: TaskTable[]) => updateTask(taskId, { tables: next })

  function updateTable(id: string, change: (table: TaskTable) => TaskTable) {
    save(tables.map((table) => (table.id === id ? change(table) : table)))
  }

  function addColumn(table: TaskTable) {
    const id = crypto.randomUUID()
    updateTable(table.id, (current) => ({
      ...current,
      columns: [...current.columns, { id, title: `Coluna ${current.columns.length + 1}` }],
      rows: current.rows.map((row) => ({ ...row, cells: { ...row.cells, [id]: '' } })),
    }))
  }

  function deleteTable(table: TaskTable) {
    confirmAction({
      title: 'Excluir tabela',
      description: `Excluir a tabela "${table.title?.trim() || 'Sem título'}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir tabela',
      danger: true,
      onConfirm: () => save(tables.filter((item) => item.id !== table.id)),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {tables.map((table, index) => {
        const isEditing = editingTableId === table.id
        return (
          <section key={table.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="relative flex items-center gap-2 border-b border-border px-3 py-2">
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
              <button
                aria-label={isEditing ? 'Concluir edição da tabela' : 'Opções da tabela'}
                aria-expanded={menuTableId === table.id}
                onClick={() => {
                  if (isEditing) setEditingTableId(null)
                  else setMenuTableId((current) => current === table.id ? null : table.id)
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt hover:text-accent"
              >
                {isEditing ? <Check size={16} /> : <Pencil size={15} />}
              </button>
              {menuTableId === table.id && !isEditing && <div role="menu" className="absolute right-3 top-11 z-30 flex min-w-44 flex-col rounded-xl border border-border bg-base p-1.5 shadow-lg">
                <button role="menuitem" onClick={() => { setEditingTableId(table.id); setMenuTableId(null) }} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-text hover:bg-surface">
                  <Pencil size={15} /> Editar tabela
                </button>
                <button role="menuitem" onClick={() => { setMenuTableId(null); deleteTable(table) }} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-danger hover:bg-surface">
                  <Trash2 size={15} /> Excluir tabela
                </button>
              </div>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {table.columns.map((column) => (
                      <th key={column.id} className="min-w-36 border-b border-r border-border bg-surface-alt p-2 last:border-r-0">
                        <div className="flex items-center gap-1">
                          {isEditing ? <input
                            value={column.title}
                            onChange={(event) => updateTable(table.id, (current) => ({
                              ...current,
                              columns: current.columns.map((item) => item.id === column.id ? { ...item, title: event.target.value } : item),
                            }))}
                            aria-label="Nome da coluna"
                            className="w-full min-w-20 bg-transparent text-xs font-bold text-text outline-none"
                          /> : <span className="min-w-20 flex-1 text-xs font-bold text-text">{column.title}</span>}
                          {isEditing && <button
                            onClick={() => updateTable(table.id, (current) => ({
                              ...current,
                              columns: current.columns.filter((item) => item.id !== column.id),
                              rows: current.rows.map((row) => { const { [column.id]: _removed, ...cells } = row.cells; return { ...row, cells } }),
                            }))}
                            aria-label={`Excluir coluna ${column.title}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger hover:bg-danger/20"
                          ><Minus size={15} /></button>}
                        </div>
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
                  {table.rows.map((row) => (
                    <tr key={row.id}>
                      {table.columns.map((column) => (
                        <td key={column.id} className="border-b border-r border-border p-1.5 last:border-r-0">
                          {isEditing ? <input
                            value={row.cells[column.id] ?? ''}
                            onChange={(event) => updateTable(table.id, (current) => ({
                              ...current,
                              rows: current.rows.map((item) => item.id === row.id ? { ...item, cells: { ...item.cells, [column.id]: event.target.value } } : item),
                            }))}
                            aria-label={`${column.title}, linha`}
                            className="w-full min-w-32 rounded-md bg-transparent px-1.5 py-1 text-sm text-text outline-none focus:bg-base"
                          /> : <span className="block min-h-7 min-w-32 whitespace-pre-wrap px-1.5 py-1 text-sm text-text">{row.cells[column.id] ?? ''}</span>}
                        </td>
                      ))}
                      {isEditing && <td className="border-b border-border p-1">
                        <button onClick={() => updateTable(table.id, (current) => ({ ...current, rows: current.rows.filter((item) => item.id !== row.id) }))} aria-label="Excluir linha" className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger hover:bg-danger/20"><Minus size={15} /></button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditing && <button
              onClick={() => updateTable(table.id, (current) => ({
                ...current,
                rows: [...current.rows, { id: crypto.randomUUID(), cells: Object.fromEntries(current.columns.map((column) => [column.id, ''])) }],
              }))}
              className="flex min-h-10 items-center gap-1.5 px-3 text-xs font-semibold text-accent"
            >
              <Plus size={14} /> Adicionar linha
            </button>}
          </section>
        )
      })}
    </div>
  )
}
