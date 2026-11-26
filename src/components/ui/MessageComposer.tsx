import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MentionDropdown } from '@/components/ui/MentionDropdown'
import { useMentionAutocomplete } from '@/components/ui/useMentionAutocomplete'
import { hasTouchKeyboard, isSubmitEnter } from '@/lib/keyboard'
import { cn } from '@/lib/utils'

// Altura máxima do campo antes de ele passar a rolar por dentro (~5 linhas).
const MAX_HEIGHT = 132

// Enter envia só com teclado físico (ver lib/keyboard) — `enterKeyHint` é o
// que troca a tecla de "enviar" por "nova linha" no teclado virtual.

interface MessageComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  sendLabel?: string
  // Quando informado, "@" abre o autocomplete de menções do workspace.
  workspaceId?: string
}

export function MessageComposer({ value, onChange, onSubmit, placeholder, sendLabel = 'Enviar', workspaceId }: MessageComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [touchKeyboard] = useState(hasTouchKeyboard)
  const mentions = useMentionAutocomplete({ value, onChange, workspaceId, textareaRef: ref })

  // Cresce com o conteúdo: zera a altura antes de medir para que o campo também
  // encolha ao apagar linhas.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Com o dropdown de menção aberto, Enter escolhe a menção em vez de enviar.
    if (mentions.handleKeyDown(e)) return
    if (!isSubmitEnter(e, touchKeyboard)) return
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="flex min-w-0 items-end gap-2">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={mentions.sync}
        onKeyUp={mentions.sync}
        onClick={mentions.sync}
        onBlur={mentions.close}
        enterKeyHint={touchKeyboard ? 'enter' : 'send'}
        placeholder={placeholder}
        className={cn(
          'min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-surface px-3.5 py-[10px]',
          'text-sm leading-[22px] text-text placeholder:text-text-faint outline-none focus:border-accent',
        )}
      />
      <button
        onClick={onSubmit}
        aria-label={sendLabel}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white"
      >
        <Send size={16} />
      </button>
      {mentions.open && (
        <MentionDropdown
          anchorRef={ref}
          items={mentions.items}
          activeIndex={mentions.activeIndex}
          onSelect={mentions.select}
          onHover={mentions.setActiveIndex}
        />
      )}
    </div>
  )
}
