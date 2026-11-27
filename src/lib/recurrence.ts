// Funções puras de recorrência — sem Supabase, sem estado. A geração de
// verdade (ler/gravar projetos e tarefas) fica em dataStore.ts; aqui só a
// matemática de "qual é a próxima data que bate com a regra".
import { addDays, dateKey, dueDateToLocalDate, keyToDate } from './calendar.ts'
import type { RecurrenceRule, RecurrenceTemplate, Task } from '@/types'

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function matchesRule(date: Date, rule: RecurrenceRule): boolean {
  if (rule.frequency === 'daily') return true
  if (rule.frequency === 'weekly') return (rule.weekdays ?? []).includes(date.getDay())
  const target = Math.min(rule.dayOfMonth ?? 1, daysInMonth(date.getFullYear(), date.getMonth()))
  return date.getDate() === target
}

// Primeira data estritamente depois de `from` que bate com a regra.
export function nextMatch(rule: RecurrenceRule, from: Date): Date {
  let candidate = addDays(from, 1)
  // Limite de segurança: nenhuma regra suportada precisa de mais de um ano
  // para encontrar a próxima ocorrência.
  for (let i = 0; i < 366; i++) {
    if (matchesRule(candidate, rule)) return candidate
    candidate = addDays(candidate, 1)
  }
  throw new Error('Não foi possível calcular a próxima ocorrência da recorrência.')
}

// Última ocorrência vencida (<= hoje) a partir de `anchor`, colapsando
// qualquer ocorrência intermediária perdida (ex.: app fechado por semanas) —
// gera só um ciclo de "catch-up", nunca um por período pulado. Retorna `null`
// quando ainda não venceu nada, ou quando já passou da data-fim da regra.
export function dueOccurrence(rule: RecurrenceRule, anchor: Date, today: Date): Date | null {
  let candidate = nextMatch(rule, anchor)
  if (candidate > today) return null
  let next = nextMatch(rule, candidate)
  while (next <= today) {
    candidate = next
    next = nextMatch(rule, candidate)
  }
  if (rule.endDate && candidate > dueDateToLocalDate(rule.endDate)) return null
  return candidate
}

// Diferença em dias de calendário entre um prazo (formato `dueDate`, ISO à
// meia-noite UTC do dia local) e um `createdAt` (timestamp real) — a base do
// "prazo relativo" que se preserva de ciclo em ciclo.
export function offsetDays(dueDateIso: string, anchorCreatedAtIso: string): number {
  const due = dueDateToLocalDate(dueDateIso)
  const anchor = keyToDate(dateKey(new Date(anchorCreatedAtIso)))
  return Math.round((due.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000))
}

// Reaplica um deslocamento em dias sobre a nova data de aparição, devolvendo
// no mesmo formato ISO usado hoje para `dueDate` nos formulários.
export function applyOffset(appearanceDate: Date, days: number): string {
  return new Date(dateKey(addDays(appearanceDate, days))).toISOString()
}

// --- Ocorrências puladas e "só esta" (modelo dos próximos ciclos) ---

export function isSkipped(rule: RecurrenceRule, appearance: Date): boolean {
  return Boolean(rule.skip?.includes(dateKey(appearance)))
}

// Regra que o novo ciclo herda: sem o modelo (o novo ciclo já nasce com os
// valores dele) e sem as ocorrências puladas que já passaram.
export function ruleForNextCycle(rule: RecurrenceRule, appearance: Date): RecurrenceRule {
  const key = dateKey(appearance)
  const skip = (rule.skip ?? []).filter((item) => item > key)
  const { template: _template, skip: _skip, ...rest } = rule
  return skip.length ? { ...rest, skip } : rest
}

// Fotografia dos campos que os próximos ciclos devem repetir.
export function templateFromTask(task: Task): RecurrenceTemplate {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigneeIds: task.assigneeIds,
    subtaskTitles: task.subtasks.map((subtask) => subtask.title),
    links: task.links,
    dueTime: task.dueTime,
    durationMinutes: task.durationMinutes,
    reminderMinutes: task.reminderMinutes,
    dueOffset: task.dueDate ? offsetDays(task.dueDate, task.createdAt) : undefined,
  }
}

// Campos de um novo ciclo vindos do modelo (todos, inclusive os vazios).
export function fieldsFromTemplate(template: RecurrenceTemplate, newId: () => string): Pick<Task, 'title' | 'description' | 'priority' | 'assigneeIds' | 'subtasks' | 'links' | 'dueTime' | 'durationMinutes' | 'reminderMinutes'> {
  return {
    title: template.title,
    description: template.description,
    priority: template.priority,
    assigneeIds: template.assigneeIds,
    subtasks: template.subtaskTitles.map((title) => ({ id: newId(), title, done: false })),
    links: template.links,
    dueTime: template.dueTime,
    durationMinutes: template.durationMinutes,
    reminderMinutes: template.reminderMinutes,
  }
}
