import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, RefObject, TextareaHTMLAttributes } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Altura máxima do campo antes de ele passar a rolar por dentro (~6 linhas).
const TEXTAREA_MAX_HEIGHT = 160

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
  // Ref opcional para quem precisa do elemento (ex.: menções lêem a posição do
  // cursor) sem abrir mão do auto-crescimento que vive aqui dentro.
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

export function TextArea({ label, className, id, value, textareaRef, ...props }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Cresce com o conteúdo: zera a altura antes de medir para que o campo também
  // encolha ao apagar linhas.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }, [value])

  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <textarea
        ref={(el) => {
          ref.current = el
          if (textareaRef) textareaRef.current = el
        }}
        id={id}
        value={value}
        className={cn(
          'min-h-24 w-full resize-none overflow-y-auto rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] leading-[22px] text-text placeholder:text-text-faint outline-none transition-colors focus:border-accent',
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
