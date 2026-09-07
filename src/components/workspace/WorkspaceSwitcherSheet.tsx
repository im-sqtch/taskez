import { Check, FolderKanban, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { Workspace } from '@/types'

interface WorkspaceSwitcherSheetProps {
  open: boolean
  onClose: () => void
}

const COLORS = ['#7C5CFF', '#3B9EFF', '#34D399', '#F5A524', '#F5455C', '#FF7CE0']

export function WorkspaceSwitcherSheet({ open, onClose }: WorkspaceSwitcherSheetProps) {
  const workspaces = useDataStore((s) => s.workspaces)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  const projects = useDataStore((s) => s.projects)
  const switchWorkspace = useDataStore((s) => s.switchWorkspace)
  const addWorkspace = useDataStore((s) => s.addWorkspace)
  const renameWorkspace = useDataStore((s) => s.renameWorkspace)
  const deleteWorkspace = useDataStore((s) => s.deleteWorkspace)

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Workspace | undefined>(undefined)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0]!)

  useEffect(() => {
    if (!open) setView('list')
  }, [open])

  function openCreate() {
    setEditing(undefined)
    setName('')
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]!)
    setView('form')
  }

  function openEdit(workspace: Workspace, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(workspace)
    setName(workspace.name)
    setColor(workspace.color)
    setView('form')
  }

  function handleDelete(workspace: Workspace, e: React.MouseEvent) {
    e.stopPropagation()
    confirmAction({
      title: 'Excluir workspace',
      description: `Excluir o workspace "${workspace.name}"? Todos os projetos, tarefas e a equipe dele serão apagados.`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => deleteWorkspace(workspace.id),
    })
  }

  function handleSubmit() {
    if (!name.trim()) return
    if (editing) {
      renameWorkspace(editing.id, name.trim())
      setView('list')
    } else {
      addWorkspace(name.trim(), color)
      onClose()
    }
  }

  if (view === 'form') {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={editing ? 'Editar workspace' : 'Novo workspace'}
        footer={
          <Button fullWidth size="lg" onClick={handleSubmit} disabled={!name.trim()}>
            {editing ? 'Salvar alterações' : 'Criar workspace'}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome do workspace" placeholder="Ex: Projetos Pessoais" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {!editing && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-muted">Cor</p>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  >
                    {color === c && <Check size={18} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!editing && (
            <p className="text-xs text-text-faint">A equipe do workspace atual será copiada para o novo, para você já ter com quem trabalhar.</p>
          )}
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Workspaces" subtitle="Troque de contexto ou crie um novo">
      <div className="flex flex-col gap-2">
        {workspaces.map((w) => {
          const isCurrent = w.id === currentWorkspaceId
          const projectCount = projects.filter((p) => p.workspaceId === w.id).length
          return (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                switchWorkspace(w.id)
                onClose()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  switchWorkspace(w.id)
                  onClose()
                }
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                isCurrent ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface',
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: w.color }}>
                <Layers size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{w.name}</p>
                <p className="flex items-center gap-1 text-xs text-text-faint">
                  <FolderKanban size={11} /> {projectCount} {projectCount === 1 ? 'projeto' : 'projetos'}
                </p>
              </div>
              {isCurrent && <Check size={16} className="shrink-0 text-accent" />}
              <button onClick={(e) => openEdit(w, e)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-accent" aria-label={`Editar ${w.name}`}>
                <Pencil size={14} />
              </button>
              {workspaces.length > 1 && (
                <button onClick={(e) => handleDelete(w, e)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-danger" aria-label={`Excluir ${w.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}

        <button onClick={openCreate} className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left text-text-muted transition-colors hover:border-accent hover:text-accent">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
            <Plus size={17} />
          </div>
          <p className="text-sm font-semibold">Criar workspace</p>
        </button>
      </div>
    </Sheet>
  )
}
