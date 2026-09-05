import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-text-faint">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-text">{title}</p>
        {description && <p className="max-w-64 text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
