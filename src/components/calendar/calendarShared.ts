import type { ProjectedTask } from '@/lib/recurrenceProjection'
import { useDataStore } from '@/store/dataStore'
import type { Project, RecurrenceRule, Task } from '@/types'

// Momento do último arraste concluído: o navegador pode disparar um clique logo
// após soltar a etiqueta, e ele não deve abrir o cartão rápido.
let lastDragEndAt = 0
export function markDragEnd() { lastDragEndAt = Date.now() }
export function justDragged() { return Date.now() - lastDragEndAt < 300 }

export function projectColor(project: Project | undefined) {
  return project?.color ?? 'var(--color-accent)'
}

// Tarefa exibida no calendário: pode ser uma ocorrência futura projetada de uma
// tarefa recorrente (ainda não existe no banco) — `occurrenceOf` aponta a origem.
export type CalendarTask = Task & { occurrenceOf?: string }

export function isOccurrence(task: Task): task is CalendarTask & { occurrenceOf: string } {
  return Boolean((task as CalendarTask).occurrenceOf)
}

// Pular uma ocorrência futura: guarda o dia na regra de quem repete (a tarefa
// ou o projeto). Dá para desfazer em "Repetir" → "Restaurar".
export function skipOccurrence(occurrence: ProjectedTask) {
  const { tasks, projects, updateTask, updateProject } = useDataStore.getState()
  const addSkip = (rule: RecurrenceRule): RecurrenceRule => ({ ...rule, skip: [...new Set([...(rule.skip ?? []), occurrence.occurrenceKey])].sort() })
  const { kind, id } = occurrence.occurrenceSource
  if (kind === 'task') {
    const source = tasks.find((item) => item.id === id)
    if (source?.recurrence) updateTask(source.id, { recurrence: addSkip(source.recurrence) })
  } else {
    const owner = projects.find((item) => item.id === id)
    if (owner?.recurrence) updateProject(owner.id, { recurrence: addSkip(owner.recurrence) })
  }
}

export function reminderLabel(minutes: number): string {
  if (minutes === 0) return 'Lembrete no horário'
  if (minutes === 1440) return 'Lembrete 1 dia antes'
  if (minutes % 60 === 0) return `Lembrete ${minutes / 60} h antes`
  return `Lembrete ${minutes} min antes`
}
