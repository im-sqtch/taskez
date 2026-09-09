// Funções puras de recorrência — sem Supabase, sem estado. A geração de
// verdade (ler/gravar projetos e tarefas) fica em dataStore.ts; aqui só a
// matemática de "qual é a próxima data que bate com a regra".
import { addDays, dateKey, dueDateToLocalDate, keyToDate } from '@/lib/calendar'
import type { RecurrenceRule } from '@/types'

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
