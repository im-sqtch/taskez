import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface AnchoredPopoverProps {
  anchor: HTMLElement
  onClose: () => void
  width?: number
  label: string
  children: ReactNode
}

const MARGIN = 8

// Cartão flutuante preso a um elemento (etiqueta de tarefa, "+N mais"). Abre
// abaixo do elemento e, se não couber, acima; nunca sai da tela. Fecha ao
// clicar fora, com Esc, ao rolar ou ao redimensionar a janela.
export function AnchoredPopover({ anchor, onClose, width = 320, label, children }: AnchoredPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect()
    const height = ref.current?.offsetHeight ?? 0
    const fitsBelow = rect.bottom + MARGIN + height <= window.innerHeight - MARGIN
    const top = fitsBelow ? rect.bottom + MARGIN / 2 : Math.max(MARGIN, rect.top - height - MARGIN / 2)
    const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - width - MARGIN)
    setPosition({ top, left })
  }, [anchor, width])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (ref.current?.contains(target) || anchor.contains(target)) return
      onClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
    }
    function handleScroll(event: Event) {
      if (ref.current?.contains(event.target as Node)) return
      onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  useEffect(() => { ref.current?.focus() }, [])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      data-calendar-popover
      className="fixed z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-lg outline-none"
      style={{ width, top: position?.top ?? -9999, left: position?.left ?? -9999 }}
    >
      {children}
    </div>,
    document.body,
  )
}
