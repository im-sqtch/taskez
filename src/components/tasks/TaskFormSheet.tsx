import { Plus, UserX, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, TextArea } from '@/components/ui/Input'
import { LinksField, withDraft } from '@/components/ui/LinksField'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
import { useDataStore, useWorkspaceProjects, useWorkspaceTeam } from '@/store/dataStore'
import type { Priority, Task } from '@/types'

interface TaskFormSheetProps {
  open: boolean
  onClose: () => void
  task?: Task
  defaultProjectId?: string
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: 'var(--color-text-muted)' },
  { value: 'medium', label: 'Média', color: 'var(--color-accent)' },
  { value: 'high', label: 'Alta', color: 'var(--color-warning)' },
  { value: 'urgent', label: 'Urgente', color: 'var(--color-danger)' },
]

export function TaskFormSheet({ open, onClose, task, defaultProjectId }: TaskFormSheetProps) {
  const projects = useWorkspaceProjects()
  const team = useWorkspaceTeam()
  const addTask = useDataStore((s) => s.addTask)
  const updateTask = useDataStore((s) => s.updateTask)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId)
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState('')
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [linkDraft, setLinkDraft] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'medium')
    setProjectId(task?.projectId ?? defaultProjectId)
    setAssigneeId(task?.assigneeId)
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '')
    setSubtasks(task?.subtasks.map((s) => s.title) ?? [])
    setSubtaskInput('')
    setLinks(task?.links ?? [])
    setLinkDraft('')
  }, [open, task, defaultProjectId])

  function addSubtaskDraft() {
    if (!subtaskInput.trim()) return
    setSubtasks((prev) => [...prev, subtaskInput.trim()])
    setSubtaskInput('')
  }

  function handleSubmit() {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      projectId,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      links: withDraft(links, linkDraft),
    }
    if (task) {
      updateTask(task.id, payload)
    } else {
      addTask({
        ...payload,
        subtasks: subtasks.map((t) => ({ id: crypto.randomUUID(), title: t, done: false })),
      })
    }
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Editar tarefa' : 'Nova tarefa'}
      footer={
        <Button fullWidth size="lg" onClick={handleSubmit} disabled={!title.trim()}>
          {task ? 'Salvar alterações' : 'Criar tarefa'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Título"
          placeholder="Ex: Enviar proposta para o cliente"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <TextArea
          label="Descrição (opcional)"
          placeholder="Adicione detalhes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <LinksField links={links} onChange={setLinks} draft={linkDraft} onDraftChange={setLinkDraft} />

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Prioridade</FieldLabel>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={cn(
                  'flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors',
                  priority === p.value ? 'border-transparent text-white' : 'border-border text-text-muted',
                )}
                style={priority === p.value ? { backgroundColor: p.color } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Delegar para</FieldLabel>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            <button onClick={() => setAssigneeId(undefined)} className="flex shrink-0 flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-text-faint',
                  !assigneeId ? 'border-accent text-accent' : 'border-border',
                )}
              >
                <UserX size={17} />
              </div>
              <span className={cn('text-[11px] font-medium', !assigneeId ? 'text-accent' : 'text-text-faint')}>
                Ninguém
              </span>
            </button>
            {team.map((member) => (
              <button
                key={member.id}
                onClick={() => setAssigneeId(member.id)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <Avatar
                  name={member.name}
                  color={member.avatarColor}
                  size="md"
                  className={cn(assigneeId === member.id && 'ring-2 ring-accent ring-offset-2 ring-offset-surface-alt')}
                />
                <span
                  className={cn(
                    'max-w-14 truncate text-[11px] font-medium',
                    assigneeId === member.id ? 'text-accent' : 'text-text-faint',
                  )}
                >
                  {member.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="task-due">Prazo</FieldLabel>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-13 rounded-2xl border border-border bg-surface px-3.5 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="task-project">Projeto</FieldLabel>
            <select
              id="task-project"
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value || undefined)}
              className="h-13 rounded-2xl border border-border bg-surface px-3.5 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">Nenhum</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!task && (
          <div className="flex flex-col gap-2">
            <FieldLabel>Subtarefas</FieldLabel>
            {subtasks.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                <span className="text-text">{s}</span>
                <button
                  onClick={() => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-text-faint hover:text-danger"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSubtaskDraft()
                  }
                }}
                placeholder="Adicionar subtarefa"
                className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent"
              />
              <button
                onClick={addSubtaskDraft}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-text-muted hover:text-accent"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
