import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
}

export function Field({ label, icon, error, className, id, ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <div className="relative flex items-center">
        {icon && <span className="absolute left-4 text-text-faint">{icon}</span>}
        <input
          id={id}
          className={cn(
            'h-13 w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none transition-colors focus:border-accent',
            icon && 'pl-11',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </label>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function TextArea({ label, className, id, ...props }: TextAreaProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <textarea
        id={id}
        className={cn(
          'min-h-24 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none transition-colors focus:border-accent',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium text-text-muted', className)} {...props} />
}
