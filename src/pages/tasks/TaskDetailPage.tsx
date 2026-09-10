import { ArrowLeft, Check, CheckCheck, Circle, Paperclip, Pencil, Plus, Repeat, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ReorderSubtasksSheet } from '@/components/tasks/ReorderSubtasksSheet'
import { SubtaskMenu } from '@/components/tasks/SubtaskMenu'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextArea } from '@/components/ui/Input'
import { LinksList } from '@/components/ui/LinksField'
import { MessageComposer } from '@/components/ui/MessageComposer'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const task = useDataStore((s) => s.tasks.find((t) => t.id === id))
  const project = useDataStore((s) => s.projects.find((p) => p.id === task?.projectId))
  // Filtra no corpo do componente (não dentro do seletor do zustand): um
  // `.filter()` ali criaria um array novo a cada notificação da store e
  // entraria em loop de re-render ("Maximum update depth exceeded").
  const team = useDataStore((s) => s.team)
  const assignees = team.filter((m) => task?.assigneeIds.includes(m.id))
  const toggleTaskStatus = useDataStore((s) => s.toggleTaskStatus)
  const deleteTask = useDataStore((s) => s.deleteTask)
  const addSubtask = useDataStore((s) => s.addSubtask)
  const editSubtask = useDataStore((s) => s.editSubtask)
  const toggleSubtask = useDataStore((s) => s.toggleSubtask)
  const removeSubtask = useDataStore((s) => s.removeSubtask)
  const addComment = useDataStore((s) => s.addComment)
  const currentUser = useAuthStore((s) => s.currentUser())

  const [editOpen, setEditOpen] = useState(false)
  const [reorderSubtasksOpen, setReorderSubtasksOpen] = useState(false)
  const [subtaskInput, setSubtaskInput] = useState('')
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editingSubtaskValue, setEditingSubtaskValue] = useState('')
  const [commentInput, setCommentInput] = useState('')

  if (!task) {
    return (
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <EmptyState icon={<Check size={22} />} title="Tarefa não encontrada" />
      </div>
    )
  }

  const overdue = isOverdue(task.dueDate) && task.status !== 'done'
  const doneCount = task.subtasks.filter((s) => s.done).length

  function handleDelete() {
    if (!task) return
    confirmAction({
      title: 'Excluir tarefa',
      description: `Excluir a tarefa "${task.title}"?`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => {
        deleteTask(task.id)
        navigate(-1)
      },
    })
  }

  function handleAddSubtask() {
    if (!subtaskInput.trim() || !task) return
    addSubtask(task.id, subtaskInput.trim())
    setSubtaskInput('')
  }

  function startEditSubtask(subtaskId: string, title: string) {
    setEditingSubtaskId(subtaskId)
    setEditingSubtaskValue(title)
  }

  function saveEditSubtask() {
    if (!task || !editingSubtaskId || !editingSubtaskValue.trim()) return
    editSubtask(task.id, editingSubtaskId, editingSubtaskValue.trim())
    setEditingSubtaskId(null)
  }

  function handleAddComment() {
    if (!commentInput.trim() || !task || !currentUser) return
    addComment(task.id, currentUser.id, commentInput.trim())
    setCommentInput('')
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <ArrowLeft size={19} />
        </button>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
            <Pencil size={16} />
          </button>
          {task.subtasks.length > 1 && (
            <button
              onClick={() => setReorderSubtasksOpen(true)}
              aria-label="Reordenar subtarefa"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted"
            >
              <SlidersHorizontal size={16} />
            </button>
          )}
          <button onClick={handleDelete} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleTaskStatus(task.id)}
            className={cn('mt-0.5 shrink-0', task.status === 'done' ? 'text-success' : 'text-text-faint')}
          >
            {task.status === 'done' ? <CheckCheck size={24} /> : <Circle size={24} />}
          </button>
          <h1 className={cn('flex flex-1 items-center gap-1.5 text-xl font-bold text-text', task.status === 'done' && 'line-through text-text-faint')}>
            {task.title}
            {(task.recurrence ?? project?.recurrence) && <Repeat size={15} className="shrink-0 text-text-faint" aria-label="Recorrente" />}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {project && (
            <button
              onClick={() => navigate(`/projects/${project.id}`)}
              className="flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </button>
          )}
          {task.dueDate && (
            <span className={cn('text-xs font-semibold', overdue ? 'text-danger' : 'text-text-faint')}>
              Prazo: {formatDate(task.dueDate)}
            </span>
          )}
          {assignees.map((assignee) => (
            <span
              key={assignee.id}
              className="flex items-center gap-1.5 rounded-full bg-surface-alt py-1 pl-1 pr-2.5 text-xs font-semibold text-text-muted"
            >
              <Avatar name={assignee.name} color={assignee.avatarColor} size="xs" />
              {assignee.name}
            </span>
          ))}
        </div>

        {task.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{task.description}</p>
        )}
        <LinksList links={task.links} />
      </div>

      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-text">
            Checklist {task.subtasks.length > 0 && `(${doneCount}/${task.subtasks.length})`}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {task.subtasks.map((s) =>
            editingSubtaskId === s.id ? (
              <div key={s.id} className="flex flex-col gap-2 rounded-xl bg-surface px-3.5 py-2.5">
                <TextArea value={editingSubtaskValue} onChange={(e) => setEditingSubtaskValue(e.target.value)} autoFocus />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingSubtaskId(null)}>
                    Cancelar
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!editingSubtaskValue.trim()} onClick={saveEditSubtask}>
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="flex items-start gap-3 rounded-xl px-1 py-2 hover:bg-surface-alt">
                <button onClick={() => toggleSubtask(task.id, s.id)} className={cn('mt-0.5 shrink-0', s.done ? 'text-success' : 'text-text-faint')}>
                  {s.done ? <CheckCheck size={18} /> : <Circle size={18} />}
                </button>
                <span className={cn('flex-1 whitespace-pre-wrap text-sm text-text', s.done && 'line-through text-text-faint')}>
                  {s.title}
                </span>
                <SubtaskMenu
                  onCopy={() => void navigator.clipboard.writeText(s.title)}
                  onEdit={() => startEditSubtask(s.id, s.title)}
                  onDelete={() => removeSubtask(task.id, s.id)}
                />
              </div>
            ),
          )}
        </div>
        <TextArea
          value={subtaskInput}
          onChange={(e) => setSubtaskInput(e.target.value)}
          placeholder="Adicionar item ao checklist"
        />
        <Button variant="secondary" size="sm" icon={<Plus size={15} />} onClick={handleAddSubtask} className="self-end">
          Adicionar
        </Button>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-2">
        <p className="text-sm font-bold text-text">Comentários</p>
        {task.comments.length === 0 ? (
          <p className="text-sm text-text-faint">Nenhum comentário ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {task.comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                {currentUser && <Avatar name={currentUser.name} color={currentUser.avatarColor} size="xs" />}
                <div className="flex-1 rounded-xl bg-surface p-3">
                  {/* Preserva as quebras de linha digitadas sem deixar palavra longa estourar o balão. */}
                  <p className="whitespace-pre-wrap break-words text-sm text-text">{c.text}</p>
                  <p className="mt-1 text-[11px] text-text-faint">{formatDate(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <MessageComposer
          value={commentInput}
          onChange={setCommentInput}
          onSubmit={handleAddComment}
          placeholder="Escreva um comentário..."
          sendLabel="Enviar comentário"
        />
        <div className="flex items-center gap-2 text-xs text-text-faint">
          <Paperclip size={13} /> Anexos chegam em uma próxima fase do TaskEz.
        </div>
      </div>

      <TaskFormSheet open={editOpen} onClose={() => setEditOpen(false)} task={task} />
      <ReorderSubtasksSheet open={reorderSubtasksOpen} onClose={() => setReorderSubtasksOpen(false)} taskId={task.id} />
    </div>
  )
}
