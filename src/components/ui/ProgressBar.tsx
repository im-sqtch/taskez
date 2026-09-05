import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  color?: string
  className?: string
  trackClassName?: string
}

export function ProgressBar({ value, color = 'var(--color-accent)', className, trackClassName }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-alt', trackClassName, className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}
