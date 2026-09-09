import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, FolderKanban, Plus, UserX, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, TextArea } from '@/components/ui/Input'
import { LinksField, withDraft } from '@/components/ui/LinksField'
import { RecurrenceField } from '@/components/ui/RecurrenceField'
import { Sheet } from '@/components/ui/Sheet'
import { WEEKDAY_LABELS, addMonths, dateKey, formatMonthTitle, keyToDate, monthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { useDataStore, useWorkspaceProjects, useWorkspaceTeam } from '@/store/dataStore'
import type { Priority, RecurrenceRule, Task } from '@/types'

function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(keyToDate(key)).replace('.', '')
}

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
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined)
  const [dueSheetOpen, setDueSheetOpen] = useState(false)
  const [projectSheetOpen, setProjectSheetOpen] = useState(false)
  const [calendarCursor, setCalendarCursor] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'medium')
    setProjectId(task?.projectId ?? defaultProjectId)
    setAssigneeId(task?.assigneeId)
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '')
    setCalendarCursor(task?.dueDate ? keyToDate(task.dueDate.slice(0, 10)) : new Date())
    setSubtasks(task?.subtasks.map((s) => s.title) ?? [])
    setSubtaskInput('')
    setLinks(task?.links ?? [])
    setLinkDraft('')
    setRecurrence(task?.recurrence)
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
      // Recorrência de tarefa só faz sentido sem projeto — dentro de um
      // projeto a cadência é a dele (ver ProjectFormSheet).
      recurrence: projectId ? undefined : recurrence,
    }
    if (task) {
      updateTask(task.id, payload)
    } else {
      addTask({
        ...payload,
        // Inclui o rascunho ainda não confirmado com "+"/Enter — sem isso, a
        // última subtarefa digitada se perdia silenciosamente ao criar.
        subtasks: withDraft(subtasks, subtaskInput).map((t) => ({ id: crypto.randomUUID(), title: t, done: false })),
      })
    }
    onClose()
  }

  return (
    <>
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
            <FieldLabel>Prazo</FieldLabel>
            <button
              type="button"
              onClick={() => setDueSheetOpen(true)}
              className="flex h-13 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-left text-sm text-text outline-none transition-colors focus:border-accent"
            >
              <CalendarIcon size={16} className="shrink-0 text-text-faint" />
              <span className={cn('flex-1 truncate', !dueDate && 'text-text-faint')}>
                {dueDate ? formatShortDate(dueDate) : 'Nenhum'}
              </span>
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Projeto</FieldLabel>
            <button
              type="button"
              onClick={() => setProjectSheetOpen(true)}
              className="flex h-13 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-left text-sm text-text outline-none transition-colors focus:border-accent"
            >
              <FolderKanban size={16} className="shrink-0 text-text-faint" />
              <span className={cn('flex-1 truncate', !projectId && 'text-text-faint')}>
                {projects.find((p) => p.id === projectId)?.name ?? 'Nenhum'}
              </span>
            </button>
          </div>
        </div>

        {!projectId && <RecurrenceField value={recurrence} onChange={setRecurrence} />}

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

    <Sheet
      open={dueSheetOpen}
      onClose={() => setDueSheetOpen(false)}
      title="Prazo"
      headerAction={
        dueDate ? (
          <button
            onClick={() => {
              setDueDate('')
              setDueSheetOpen(false)
            }}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-danger"
          >
            Remover
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text">{formatMonthTitle(calendarCursor)}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCalendarCursor((c) => addMonths(c, -1))}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCalendarCursor((c) => addMonths(c, 1))}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-text-faint">
              {label}
            </span>
          ))}
          {monthGrid(calendarCursor).map((date) => {
            const key = dateKey(date)
            const selected = key === dueDate
            const muted = date.getMonth() !== calendarCursor.getMonth()
            return (
              <button
                key={key}
                onClick={() => {
                  setDueDate(key)
                  setDueSheetOpen(false)
                }}
                className="flex items-center justify-center py-1"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                    selected && 'bg-accent font-bold text-white',
                    !selected && muted && 'text-text-faint',
                    !selected && !muted && 'font-medium text-text',
                  )}
                >
                  {date.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>

    <Sheet open={projectSheetOpen} onClose={() => setProjectSheetOpen(false)} title="Projeto">
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => {
            setProjectId(undefined)
            setProjectSheetOpen(false)
          }}
          className={cn(
            'flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors',
            !projectId ? 'bg-accent-soft text-accent' : 'text-text',
          )}
        >
          Nenhum
          {!projectId && <Check size={16} />}
        </button>
        {projects.map((p) => {
          const isCurrent = p.id === projectId
          return (
            <button
              key={p.id}
              onClick={() => {
                setProjectId(p.id)
                setProjectSheetOpen(false)
              }}
              className={cn(
                'flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors',
                isCurrent ? 'bg-accent-soft text-accent' : 'text-text',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
              {isCurrent && <Check size={16} />}
            </button>
          )
        })}
      </div>
    </Sheet>
    </>
  )
}
