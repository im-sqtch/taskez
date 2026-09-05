import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: () => void
  'aria-label'?: string
}

export function Switch({ checked, onChange, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <button
      onClick={onChange}
      aria-label={ariaLabel}
      aria-pressed={checked}
      className={cn('h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors', checked ? 'bg-accent' : 'bg-surface-alt')}
    >
      <span className={cn('block h-5 w-5 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}
