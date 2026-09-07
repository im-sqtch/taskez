// Helpers de calendário. A regra central aqui é a chave do dia ("YYYY-MM-DD"):
// é ela que junta uma tarefa à célula certa da grade.
export const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// Chave de um dia do calendário, a partir dos componentes locais da data — nunca
// via toISOString(), que converteria para UTC e jogaria o dia para trás à noite.
export function dateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Chave de um prazo de tarefa. O prazo é gravado como new Date('YYYY-MM-DD')
// .toISOString(), ou seja meia-noite UTC do dia escolhido no formulário: ler os
// 10 primeiros caracteres devolve exatamente esse dia, enquanto interpretar a
// string como data local devolveria o dia anterior em fusos negativos (no Brasil,
// 2026-09-07T00:00:00Z é 21h de 06/09).
export function dueDateKey(iso: string): string {
  return iso.slice(0, 10)
}

export function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// Sempre ancorado no dia 1 para não esbarrar em overflow (31 de janeiro + 1 mês
// viraria 3 de março).
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay())
}

export function weekGrid(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// 6 semanas fixas: a altura da grade não muda ao trocar de mês.
export function monthGrid(date: Date): Date[] {
  const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatMonthTitle(date: Date): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date))
}

// "7 a 13 de set" quando a semana cabe num mês, "28 de set a 4 de out" quando cruza.
export function formatWeekTitle(days: Date[]): string {
  const first = days[0]!
  const last = days[days.length - 1]!
  const month = (d: Date) => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} a ${last.getDate()} de ${month(first)}`
  }
  return `${first.getDate()} de ${month(first)} a ${last.getDate()} de ${month(last)}`
}

export function formatFullDate(date: Date): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date))
}
