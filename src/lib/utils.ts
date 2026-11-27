import { clsx, type ClassValue } from 'clsx'
import { dueDateToLocalDate, dueMoment, formatTimeRange } from './calendar'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function formatDate(iso?: string) {
  if (!iso) return undefined
  // dueDateToLocalDate: nunca `new Date(iso)` direto, senão o dia exibido
  // muda conforme o fuso horário do navegador (ver calendar.ts).
  const date = dueDateToLocalDate(iso)
  const today = new Date()
  const diffDays = Math.round(
    (date.getTime() - today.setHours(0, 0, 0, 0)) / 86_400_000,
  )
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  if (diffDays === -1) return 'Ontem'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

export function isOverdue(iso?: string, time?: string) {
  if (!iso) return false
  return dueMoment(iso, time).getTime() < Date.now()
}

// "Hoje, 14:30" / "12 de nov." — prazo com o horário, quando houver.
export function formatDue(iso?: string, time?: string, durationMinutes?: number) {
  const day = formatDate(iso)
  if (!day) return undefined
  return time ? `${day}, ${formatTimeRange(time, durationMinutes)}` : day
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
