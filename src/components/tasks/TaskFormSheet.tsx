import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, FolderKanban, Plus, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SubtaskMenu } from '@/components/tasks/SubtaskMenu'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel } from '@/components/ui/Input'
import { LinksField, withDraft } from '@/components/ui/LinksField'
import { MentionText } from '@/components/ui/MentionText'
import { MentionTextArea } from '@/components/ui/MentionTextArea'
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
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  const allProjects = useDataStore((s) => s.projects)
  // A sheet pode ser aberta a partir de um projeto de outra workspace (a lista
  // de projetos do formulário é a da workspace atual, mas o projeto de origem
  // manda mais).
  const mentionWorkspaceId =
    task?.workspaceId ?? allProjects.find((p) => p.id === defaultProjectId)?.workspaceId ?? currentWorkspaceId

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null)
  const [editingSubtaskValue, setEditingSubtaskValue] = useState('')
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
    setAssigneeIds(task?.assigneeIds ?? [])
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '')
    setCalendarCursor(task?.dueDate ? keyToDate(task.dueDate.slice(0, 10)) : new Date())
    setSubtasks(task?.subtasks.map((s) => s.title) ?? [])
    setSubtaskInput('')
    setEditingSubtaskIndex(null)
    setLinks(task?.links ?? [])
    setLinkDraft('')
    setRecurrence(task?.recurrence)
  }, [open, task, defaultProjectId])

  function addSubtaskDraft() {
    if (!subtaskInput.trim()) return
    setSubtasks((prev) => [...prev, subtaskInput.trim()])
    setSubtaskInput('')
  }

  function saveEditSubtaskDraft() {
    if (editingSubtaskIndex === null || !editingSubtaskValue.trim()) return
    setSubtasks((prev) => prev.map((t, idx) => (idx === editingSubtaskIndex ? editingSubtaskValue.trim() : t)))
    setEditingSubtaskIndex(null)
  }

  function toggleAssignee(memberId: string) {
    setAssigneeIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  function handleSubmit() {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      projectId,
      assigneeIds,
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
        <MentionTextArea
          label="Descrição (opcional)"
          placeholder="Adicione detalhes... Use @ para mencionar"
          value={description}
          onChange={setDescription}
          workspaceId={mentionWorkspaceId}
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
            <button onClick={() => setAssigneeIds([])} className="flex shrink-0 flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-text-faint',
                  assigneeIds.length === 0 ? 'border-accent text-accent' : 'border-border',
                )}
              >
                <UserX size={17} />
              </div>
              <span className={cn('text-[11px] font-medium', assigneeIds.length === 0 ? 'text-accent' : 'text-text-faint')}>
                Ninguém
              </span>
            </button>
            {team.map((member) => {
              const selected = assigneeIds.includes(member.id)
              return (
                <button
                  key={member.id}
                  onClick={() => toggleAssignee(member.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="relative">
                    <Avatar
                      name={member.name}
                      color={member.avatarColor}
                      size="md"
                      className={cn(selected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface-alt')}
                    />
                    {selected && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white ring-2 ring-surface-alt">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className={cn('max-w-14 truncate text-[11px] font-medium', selected ? 'text-accent' : 'text-text-faint')}>
                    {member.name.split(' ')[0]}
                  </span>
                </button>
              )
            })}
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
            {subtasks.map((s, i) =>
              editingSubtaskIndex === i ? (
                <div key={i} className="flex flex-col gap-2 rounded-xl bg-surface px-3.5 py-2.5">
                  <MentionTextArea
                    value={editingSubtaskValue}
                    onChange={setEditingSubtaskValue}
                    workspaceId={mentionWorkspaceId}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingSubtaskIndex(null)}>
                      Cancelar
                    </Button>
                    <Button variant="secondary" size="sm" disabled={!editingSubtaskValue.trim()} onClick={saveEditSubtaskDraft}>
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                  <span className="flex-1 whitespace-pre-wrap text-text">
                    <MentionText text={s} workspaceId={mentionWorkspaceId} />
                  </span>
                  <SubtaskMenu
                    onCopy={() => void navigator.clipboard.writeText(s)}
                    onEdit={() => {
                      setEditingSubtaskIndex(i)
                      setEditingSubtaskValue(s)
                    }}
                    onDelete={() => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                </div>
              ),
            )}
            <MentionTextArea
              value={subtaskInput}
              onChange={setSubtaskInput}
              workspaceId={mentionWorkspaceId}
              placeholder="Adicionar subtarefa"
            />
            <Button variant="secondary" size="sm" icon={<Plus size={15} />} onClick={addSubtaskDraft} className="self-end">
              Adicionar
            </Button>
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
