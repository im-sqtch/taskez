import type { Project, Task } from '@/types'

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
