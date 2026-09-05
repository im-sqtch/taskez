import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function Sheet({ open, onClose, title, subtitle, children, footer }: SheetProps) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl border-t border-border bg-surface-alt pb-[env(safe-area-inset-bottom)]',
          'animate-[sheet-in_0.25s_ease-out]',
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />
        {title && (
          <div className="flex shrink-0 items-start justify-between px-5 pt-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-bold text-text">{title}</h2>
              {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-border-soft px-5 py-4">{footer}</div>}
      </div>
      <style>{`
        @keyframes sheet-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  )
}
