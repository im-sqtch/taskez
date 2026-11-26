// Projeção das próximas ocorrências de tarefas recorrentes, só para exibição
// (calendário). A geração de verdade continua em dataStore: cada ciclo vira
// uma tarefa real no dia em que "aparece". Aqui calculamos, sem gravar nada,
// em que dias os próximos ciclos vão cair, usando a mesma regra (nextMatch) e o
// mesmo deslocamento de prazo (offsetDays) da geração.
import { addDays, dateKey, dueDateToLocalDate, keyToDate, keyToDueDate } from './calendar.ts'
import { nextMatch, offsetDays } from './recurrence.ts'
import type { Project, RecurrenceRule, Task } from '@/types'

export const PROJECTION_DAYS = 60

export type ProjectedTask = Task & { occurrenceOf: string }

const MAX_ITERATIONS = 400

function localMidnight(createdAt: string) {
  return keyToDate(dateKey(new Date(createdAt)))
}

// Datas de "aparição" dos próximos ciclos depois de `anchor`, até `limit`.
function appearances(rule: RecurrenceRule, anchor: Date, limit: Date): Date[] {
  const result: Date[] = []
  const end = rule.endDate ? dueDateToLocalDate(rule.endDate) : null
  let current = anchor
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    current = nextMatch(rule, current)
    if (current > limit || (end && current > end)) break
    result.push(current)
  }
  return result
}

function occurrence(task: Task, due: Date, cycleKey: string): ProjectedTask {
  return {
    ...task,
    id: `occ:${task.id}:${cycleKey}`,
    occurrenceOf: task.id,
    dueDate: keyToDueDate(dateKey(due)),
    status: 'todo',
    notFulfilled: false,
    completedAt: undefined,
    comments: [],
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: false })),
  }
}

export function projectRecurringTasks(tasks: Task[], projects: Project[], today: Date, days = PROJECTION_DAYS): ProjectedTask[] {
  const start = keyToDate(dateKey(today))
  const horizon = addDays(start, days)
  const result: ProjectedTask[] = []
  const inWindow = (date: Date) => date >= start && date <= horizon
  // Mesma regra da geração: tarefas com cadência própria não são copiadas
  // junto com o ciclo do projeto.
  const independentSeries = new Set(tasks.filter((task) => task.recurrence).map((task) => task.seriesId ?? task.id))

  for (const task of tasks) {
    if (!task.recurrence || !task.dueDate) continue
    try {
      const offset = offsetDays(task.dueDate, task.createdAt)
      for (const appearance of appearances(task.recurrence, localMidnight(task.createdAt), addDays(horizon, Math.max(0, -offset)))) {
        // Ciclos que já "apareceram" são gerados de verdade pela store.
        if (appearance <= start) continue
        const due = addDays(appearance, offset)
        if (inWindow(due)) result.push(occurrence(task, due, dateKey(appearance)))
      }
    } catch (error) {
      console.error(`Falha ao projetar recorrência da tarefa ${task.id}:`, error)
    }
  }

  for (const project of projects) {
    if (!project.recurrence) continue
    const projectTasks = tasks.filter((task) => task.projectId === project.id && task.dueDate && !independentSeries.has(task.seriesId ?? task.id))
    if (projectTasks.length === 0) continue
    try {
      const offsets = projectTasks.map((task) => offsetDays(task.dueDate!, project.createdAt))
      const lookBack = Math.max(0, -Math.min(...offsets))
      for (const appearance of appearances(project.recurrence, localMidnight(project.createdAt), addDays(horizon, lookBack))) {
        if (appearance <= start) continue
        projectTasks.forEach((task, index) => {
          const due = addDays(appearance, offsets[index]!)
          if (inWindow(due)) result.push(occurrence(task, due, dateKey(appearance)))
        })
      }
    } catch (error) {
      console.error(`Falha ao projetar recorrência do projeto ${project.id}:`, error)
    }
  }

  return result
}
