import { FolderKanban, ListTodo, Paperclip } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { MentionEntity, MentionType } from '@/lib/mentions'

const TYPE_LABEL: Record<MentionType, string> = {
  project: 'Projeto',
  task: 'Tarefa',
  member: 'Pessoa',
  file: 'Arquivo',
}

const MAX_HEIGHT = 232

interface Anchor {
  left: number
  top: number
  bottom: number
  width: number
}

interface MentionDropdownProps {
  anchorRef: RefObject<HTMLTextAreaElement | null>
  items: MentionEntity[]
  activeIndex: number
  onSelect: (entity: MentionEntity) => void
  onHover: (index: number) => void
}

// Fica num portal com posição fixa: dentro das sheets o conteúdo rola num
// contêiner com `overflow-y-auto`, e um dropdown absoluto ali seria cortado.
export function MentionDropdown({ anchorRef, items, activeIndex, onSelect, onHover }: MentionDropdownProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  useLayoutEffect(() => {
    function update() {
      const el = anchorRef.current
      if (!el) return
      const box = el.getBoundingClientRect()
      // Só troca o estado quando a posição muda de verdade — sem isso, um efeito
      // sem lista de dependências entraria em loop de render.
      setAnchor((prev) =>
        prev && prev.left === box.left && prev.top === box.top && prev.bottom === box.bottom && prev.width === box.width
          ? prev
          : { left: box.left, top: box.top, bottom: box.bottom, width: box.width },
      )
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  })

  if (!anchor) return null

  const spaceBelow = window.innerHeight - anchor.bottom
  const flipUp = spaceBelow < MAX_HEIGHT + 16 && anchor.top > spaceBelow

  return createPortal(
    <div
      role="listbox"
      className="fixed z-[60] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface shadow-lg"
      style={{
        left: anchor.left,
        width: anchor.width,
        maxHeight: MAX_HEIGHT,
        ...(flipUp ? { bottom: window.innerHeight - anchor.top + 6 } : { top: anchor.bottom + 6 }),
      }}
    >
      {items.map((item, index) => (
        <button
          key={`${item.type}-${item.id}`}
          role="option"
          aria-selected={index === activeIndex}
          // `preventDefault` no mousedown mantém o foco no campo: sem isso o
          // blur fecharia o dropdown antes do clique chegar.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item)}
          onMouseEnter={() => onHover(index)}
          className={cn(
            'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
            index === activeIndex ? 'bg-surface-alt' : 'hover:bg-surface-alt',
          )}
        >
          {item.type === 'member' ? (
            <Avatar name={item.name} color={item.color ?? '#7C5CFF'} size="xs" />
          ) : (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
              style={{ backgroundColor: item.type === 'project' ? (item.color ?? '#7C5CFF') : 'var(--color-surface-alt)' }}
            >
              {item.type === 'project' ? (
                <FolderKanban size={12} />
              ) : item.type === 'task' ? (
                <ListTodo size={12} className="text-text-muted" />
              ) : (
                <Paperclip size={12} className="text-text-muted" />
              )}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-text">{item.name}</span>
          <span className="shrink-0 text-[11px] font-medium text-text-faint">{TYPE_LABEL[item.type]}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
