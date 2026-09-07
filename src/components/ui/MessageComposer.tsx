import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Altura máxima do campo antes de ele passar a rolar por dentro (~5 linhas).
const MAX_HEIGHT = 132

// Teclado de celular não tem Shift+Enter, então lá o Enter é sempre quebra de
// linha (como no WhatsApp) e o envio fica só no botão — `enterKeyHint` é o que
// troca a tecla de "enviar" por "nova linha" no teclado virtual. Com teclado
// físico vale a convenção de sempre: Enter envia, Shift+Enter quebra a linha.
function hasTouchKeyboard() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

interface MessageComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  sendLabel?: string
}

export function MessageComposer({ value, onChange, onSubmit, placeholder, sendLabel = 'Enviar' }: MessageComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [touchKeyboard] = useState(hasTouchKeyboard)

  // Cresce com o conteúdo: zera a altura antes de medir para que o campo também
  // encolha ao apagar linhas.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || touchKeyboard || e.shiftKey) return
    // Enquanto o IME está compondo (acentos, teclados asiáticos), o Enter
    // confirma a palavra — não pode ser confundido com envio.
    if (e.nativeEvent.isComposing) return
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        enterKeyHint={touchKeyboard ? 'enter' : 'send'}
        placeholder={placeholder}
        className={cn(
          'min-h-11 flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-surface px-3.5 py-[10px]',
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
    </div>
  )
}
