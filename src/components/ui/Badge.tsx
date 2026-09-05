import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Priority, TaskStatus } from '@/types'

interface BadgeProps {
  children: ReactNode
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
  className?: string
}

const tones = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-alt text-text-muted',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const priorityConfig: Record<Priority, { label: string; tone: BadgeProps['tone'] }> = {
  low: { label: 'Baixa', tone: 'neutral' },
  medium: { label: 'Média', tone: 'accent' },
  high: { label: 'Alta', tone: 'warning' },
  urgent: { label: 'Urgente', tone: 'danger' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority]
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const statusConfig: Record<TaskStatus, { label: string; tone: BadgeProps['tone'] }> = {
  todo: { label: 'A fazer', tone: 'neutral' },
  in_progress: { label: 'Em progresso', tone: 'accent' },
  done: { label: 'Concluída', tone: 'success' },
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status]
  return <Badge tone={config.tone}>{config.label}</Badge>
}
