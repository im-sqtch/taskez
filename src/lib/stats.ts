import type { Task } from '@/types'

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function computeStats(tasks: Task[]) {
  const today = new Date()
  const dueToday = tasks.filter((t) => t.status !== 'done' && t.dueDate && sameDay(new Date(t.dueDate), today))
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today && !sameDay(new Date(t.dueDate), today),
  )
  const completedToday = tasks.filter((t) => t.completedAt && sameDay(new Date(t.completedAt), today))

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const dueThisWeek = tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= startOfWeek)
  const doneThisWeek = dueThisWeek.filter((t) => t.status === 'done')
  const weekProgress = dueThisWeek.length === 0 ? 0 : Math.round((doneThisWeek.length / dueThisWeek.length) * 100)

  let streak = 0
  const cursor = new Date(today)
  for (let i = 0; i < 365; i++) {
    const hasCompletion = tasks.some((t) => t.completedAt && sameDay(new Date(t.completedAt), cursor))
    if (!hasCompletion) {
      if (i === 0) {
        cursor.setDate(cursor.getDate() - 1)
        continue
      }
      break
    }
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const completedTotal = tasks.filter((t) => t.status === 'done').length

  const inProgress = tasks.filter((t) => t.status === 'in_progress').length

  return {
    dueToday: dueToday.length,
    overdue: overdue.length,
    completedToday: completedToday.length,
    weekProgress,
    streak,
    completedTotal,
    totalTasks: tasks.length,
    inProgress,
  }
}

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

export interface WeeklyHistoryDay {
  label: string
  count: number
  isToday: boolean
}

// Histórico dos 7 dias da semana corrente (domingo a sábado), usado no widget
// Resumo de Produtividade em tamanho Grande.
export function weeklyHistory(tasks: Task[]): WeeklyHistoryDay[] {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    const count = tasks.filter((t) => t.completedAt && sameDay(new Date(t.completedAt), day)).length
    return { label: WEEKDAY_LETTERS[day.getDay()]!, count, isToday: sameDay(day, today) }
  })
}
