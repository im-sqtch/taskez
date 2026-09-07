import { ArrowLeft, Check, CheckCheck, Circle, Paperclip, Pencil, Plus, Send, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LinksList } from '@/components/ui/LinksField'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const task = useDataStore((s) => s.tasks.find((t) => t.id === id))
  const project = useDataStore((s) => s.projects.find((p) => p.id === task?.projectId))
  const assignee = useDataStore((s) => s.team.find((m) => m.id === task?.assigneeId))
  const toggleTaskStatus = useDataStore((s) => s.toggleTaskStatus)
  const deleteTask = useDataStore((s) => s.deleteTask)
  const addSubtask = useDataStore((s) => s.addSubtask)
  const toggleSubtask = useDataStore((s) => s.toggleSubtask)
  const removeSubtask = useDataStore((s) => s.removeSubtask)
  const addComment = useDataStore((s) => s.addComment)
  const currentUser = useAuthStore((s) => s.currentUser())

  const [editOpen, setEditOpen] = useState(false)
  const [subtaskInput, setSubtaskInput] = useState('')
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
          <h1 className={cn('flex-1 text-xl font-bold text-text', task.status === 'done' && 'line-through text-text-faint')}>
            {task.title}
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
          {assignee && (
            <span className="flex items-center gap-1.5 rounded-full bg-surface-alt py-1 pl-1 pr-2.5 text-xs font-semibold text-text-muted">
              <Avatar name={assignee.name} color={assignee.avatarColor} size="xs" />
              {assignee.name}
            </span>
          )}
        </div>

        {task.description && <p className="text-sm leading-relaxed text-text-muted">{task.description}</p>}
        <LinksList links={task.links} />
      </div>

      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-text">
            Checklist {task.subtasks.length > 0 && `(${doneCount}/${task.subtasks.length})`}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {task.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-surface-alt">
              <button onClick={() => toggleSubtask(task.id, s.id)} className={s.done ? 'text-success' : 'text-text-faint'}>
                {s.done ? <CheckCheck size={18} /> : <Circle size={18} />}
              </button>
              <span className={cn('flex-1 text-sm text-text', s.done && 'line-through text-text-faint')}>{s.title}</span>
              <button onClick={() => removeSubtask(task.id, s.id)} className="text-text-faint hover:text-danger">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
            placeholder="Adicionar item ao checklist"
            className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent"
          />
          <button onClick={handleAddSubtask} className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-text-muted hover:text-accent">
            <Plus size={18} />
          </button>
        </div>
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
                  <p className="text-sm text-text">{c.text}</p>
                  <p className="mt-1 text-[11px] text-text-faint">{formatDate(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Escreva um comentário..."
            className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent"
          />
          <button onClick={handleAddComment} className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
            <Send size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-faint">
          <Paperclip size={13} /> Anexos chegam em uma próxima fase do TaskEz.
        </div>
      </div>

      <TaskFormSheet open={editOpen} onClose={() => setEditOpen(false)} task={task} />
    </div>
  )
}
