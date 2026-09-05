import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

export function Card({ elevated, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-soft p-4',
        elevated ? 'bg-surface-alt' : 'bg-surface',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
