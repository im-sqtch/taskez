import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import type { MessageReaction } from '@/types'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

interface ReactionControlProps {
  children: ReactNode
  reactions: MessageReaction[]
  currentUserId: string | null
  onReact: (emoji: string) => void
  align?: 'left' | 'right'
  fill?: boolean
}

export function ReactionControl({ children, reactions, currentUserId, onReact, align = 'left', fill = false }: ReactionControlProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
    touchStart.current = null
  }

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }, [])

  function handleTouchStart(event: TouchEvent) {
    if (!currentUserId || event.touches.length !== 1) return
    const touch = event.touches[0]!
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    pressTimer.current = setTimeout(() => {
      setOpen(true)
      pressTimer.current = null
    }, 450)
  }

  function handleTouchMove(event: TouchEvent) {
    const start = touchStart.current
    const touch = event.touches[0]
    if (start && touch && (Math.abs(touch.clientX - start.x) > 12 || Math.abs(touch.clientY - start.y) > 12)) {
      cancelPress()
    }
  }

  function choose(emoji: string) {
    onReact(emoji)
    setOpen(false)
  }

  const counts = REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: reactions.filter((reaction) => reaction.emoji === emoji).length,
    mine: reactions.some((reaction) => reaction.emoji === emoji && reaction.userId === currentUserId),
  })).filter((item) => item.count > 0)

  return (
    <div
      ref={rootRef}
      className={cn('group/reaction relative min-w-0 max-sm:select-none', fill && 'flex-1')}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      onContextMenu={(event) => {
        if (!currentUserId) return
        event.preventDefault()
        cancelPress()
        setOpen(true)
      }}
    >
      {children}
      {currentUserId && (
        <>
          <button
            type="button"
            className={cn(
              'absolute -top-2 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-border-soft bg-surface/80 text-sm opacity-30 shadow-sm transition-opacity hover:opacity-100 focus:opacity-100 sm:flex sm:opacity-0 sm:group-hover/reaction:opacity-100',
              align === 'right' ? '-left-2' : '-right-2',
            )}
            aria-label="Reagir"
            title="Reagir"
            onClick={() => setOpen((value) => !value)}
          >
            🙂
          </button>
          {open && (
            <div
              className={cn(
                'absolute bottom-full z-30 mb-2 flex gap-0.5 rounded-full border border-border-soft bg-surface p-1 shadow-lg',
                align === 'right' ? 'right-0' : 'left-0',
              )}
              role="group"
              aria-label="Escolher reação"
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-surface-alt focus:bg-surface-alt"
                  aria-label={`Reagir com ${emoji}`}
                  onClick={() => choose(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {counts.length > 0 && (
        <div className={cn('mt-1 flex flex-wrap gap-1', align === 'right' && 'justify-end')}>
          {counts.map(({ emoji, count, mine }) => (
            <button
              key={emoji}
              type="button"
              disabled={!currentUserId}
              onClick={() => choose(emoji)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs',
                mine ? 'border-accent bg-accent-soft' : 'border-border-soft bg-surface',
              )}
              aria-label={`${count} ${count === 1 ? 'reação' : 'reações'} com ${emoji}`}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
