import { useRef, useState } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { TextArea } from '@/components/ui/Input'
import { MentionDropdown } from '@/components/ui/MentionDropdown'
import { useMentionAutocomplete } from '@/components/ui/useMentionAutocomplete'
import { hasTouchKeyboard, isSubmitEnter } from '@/lib/keyboard'

interface MentionTextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  label?: string
  value: string
  // Recebe o texto direto (e não o evento): a inserção da menção reescreve o
  // valor inteiro, então quem usa este campo trabalha sempre com string.
  onChange: (value: string) => void
  workspaceId: string | undefined
  singleLine?: boolean
  // Com teclado físico, Enter chama isto em vez de quebrar a linha
  // (Shift+Enter continua quebrando). No celular, Enter segue quebrando linha.
  onEnterSubmit?: () => void
}

// Campo de texto igual ao das descrições, com autocomplete de "@" para projetos,
// tarefas, pessoas e arquivos do workspace.
export function MentionTextArea({ value, onChange, workspaceId, onEnterSubmit, ...rest }: MentionTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [touchKeyboard] = useState(hasTouchKeyboard)
  const mentions = useMentionAutocomplete({ value, onChange, workspaceId, textareaRef })

  return (
    <>
      <TextArea
        {...rest}
        textareaRef={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInput={mentions.sync}
        onKeyUp={mentions.sync}
        onClick={mentions.sync}
        onBlur={mentions.close}
        onKeyDown={(event) => {
          // Com o dropdown de menção aberto, Enter escolhe a menção.
          if (mentions.handleKeyDown(event)) return
          if (!onEnterSubmit || !isSubmitEnter(event, touchKeyboard)) return
          event.preventDefault()
          onEnterSubmit()
        }}
      />
      {mentions.open && (
        <MentionDropdown
          anchorRef={textareaRef}
          items={mentions.items}
          activeIndex={mentions.activeIndex}
          onSelect={mentions.select}
          onHover={mentions.setActiveIndex}
        />
      )}
    </>
  )
}
