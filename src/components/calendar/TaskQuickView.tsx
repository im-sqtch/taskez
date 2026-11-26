import { CalendarDays, Check, CircleCheck, ExternalLink, FolderKanban, Pencil, Repeat, RotateCcw, Trash2, X } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { dueDateToLocalDate, formatFullDate } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore } from '@/store/dataStore'
import type { Project, Task } from '@/types'
import { AnchoredPopover } from './AnchoredPopover'
import { isOccurrence, projectColor } from './calendarShared'

interface TaskQuickViewProps {
  // A tarefa clicada. Tarefas reais são relidas da store (para refletir
  // edições na hora); ocorrências futuras de recorrentes só existem aqui.
  task: Task
  anchor: HTMLElement
  onClose: () => void
  onOpenDetails: (task: Task) => void
  onEdit: (task: Task) => void
}

const iconButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-accent focus-visible:outline-2 focus-visible:outline-accent'

// Cartão rápido (como o do Google Agenda) ao clicar numa tarefa da grade:
// mostra o essencial e deixa concluir, editar ou excluir sem sair do calendário.
export function TaskQuickView({ task: clicked, anchor, onClose, onOpenDetails, onEdit }: TaskQuickViewProps) {
  const projected = isOccurrence(clicked)
  const stored = useDataStore((s) => s.tasks.find((item) => item.id === clicked.id))
  const source = useDataStore((s) => (projected ? s.tasks.find((item) => item.id === clicked.occurrenceOf) : undefined))
  const task = projected ? clicked : stored
  const project = useDataStore((s) => s.projects.find((item) => item.id === task?.projectId)) as Project | undefined
  const toggleTaskStatus = useDataStore((s) => s.toggleTaskStatus)
  const updateTask = useDataStore((s) => s.updateTask)
  const deleteTask = useDataStore((s) => s.deleteTask)
  if (!task) return null
  const done = task.status === 'done'
  const recurring = projected || Boolean(task.recurrence ?? project?.recurrence)

  function handleDelete() {
    if (!task) return
    onClose()
    confirmAction({
      title: 'Excluir tarefa',
      description: `Excluir a tarefa "${task.title}"? Ela vai para a Lixeira e pode ser restaurada em até 30 dias.`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => deleteTask(task.id),
    })
  }

  return (
    <AnchoredPopover anchor={anchor} onClose={onClose} width={340} label={`Resumo de ${task.title}`}>
      <div className="-mr-2 -mt-2 mb-1 flex justify-end gap-1">
        {!projected && <button type="button" className={iconButton} aria-label="Editar tarefa" title="Editar" onClick={() => { onClose(); onEdit(task) }}><Pencil size={15} /></button>}
        {!projected && <button type="button" className={cn(iconButton, 'hover:text-danger')} aria-label="Excluir tarefa" title="Excluir" onClick={handleDelete}><Trash2 size={15} /></button>}
        <button type="button" className={iconButton} aria-label="Fechar resumo" title="Fechar" onClick={onClose}><X size={17} /></button>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-[4px]" style={{ backgroundColor: projectColor(project) }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={cn('break-words text-base font-semibold text-text', done && 'text-text-faint line-through')}>{task.title}</p>
          {task.dueDate && <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><CalendarDays size={14} aria-hidden="true" />{formatFullDate(dueDateToLocalDate(task.dueDate))}{task.dueTime ? `, ${task.dueTime}` : ''}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><FolderKanban size={14} aria-hidden="true" />{project?.name ?? 'Tarefa avulsa'}</p>
          {recurring && <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><Repeat size={14} aria-hidden="true" />Recorrente</p>}
          {task.subtasks.length > 0 && <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><Check size={14} aria-hidden="true" />{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtarefas</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">{!projected && <StatusBadge status={task.status} />}<PriorityBadge priority={task.priority} /></div>
        </div>
      </div>
      {projected ? (
        <>
          <p className="mt-3 rounded-xl bg-surface-alt px-3 py-2 text-xs text-text-muted">Ocorrência futura de uma tarefa recorrente. Ela vira uma tarefa de verdade quando o ciclo começar.</p>
          {source && <Button size="sm" fullWidth className="mt-3 whitespace-nowrap" icon={<ExternalLink size={14} />} onClick={() => { onClose(); onOpenDetails(source) }}>Abrir tarefa original</Button>}
        </>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" icon={done ? <RotateCcw size={14} /> : <CircleCheck size={14} />} onClick={() => done ? updateTask(task.id, { status: 'todo', notFulfilled: false, completedAt: undefined }) : toggleTaskStatus(task.id)}>
            {done ? 'Reabrir' : 'Concluir'}
          </Button>
          <Button size="sm" className="flex-1 whitespace-nowrap" icon={<ExternalLink size={14} />} onClick={() => { onClose(); onOpenDetails(task) }}>Abrir detalhes</Button>
        </div>
      )}
    </AnchoredPopover>
  )
}
