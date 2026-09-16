import { useLayoutEffect, useRef, useState } from 'react'
import { MentionText } from '@/components/ui/MentionText'
import { cn } from '@/lib/utils'

interface CollapsibleDescriptionProps {
  text: string
  workspaceId: string
}

export function CollapsibleDescription({ text, workspaceId }: CollapsibleDescriptionProps) {
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight)
      setOverflows(content.scrollHeight > lineHeight * 4 + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [text])

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        ref={contentRef}
        className={cn('whitespace-pre-wrap text-sm leading-relaxed text-text-muted', !expanded && 'line-clamp-4')}
      >
        <MentionText text={text} workspaceId={workspaceId} />
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-semibold text-accent"
          aria-expanded={expanded}
        >
          {expanded ? 'Mostrar menos' : 'Mostrar mais'}
        </button>
      )}
    </div>
  )
}
