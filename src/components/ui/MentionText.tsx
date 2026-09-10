import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { parseMentions } from '@/lib/mentions'
import type { MentionEntity } from '@/lib/mentions'
import { useMentionEntities } from '@/components/ui/useMentionAutocomplete'

interface MentionTextProps {
  text: string
  workspaceId: string | undefined
  // Dentro do balão do próprio autor no chat o fundo já é a cor de destaque, e
  // a pílula padrão ficaria sem contraste.
  variant?: 'default' | 'onAccent'
}

// Renderiza o texto salvo destacando as menções. Não usa nenhum elemento de
// bloco: quem chama controla o wrapper (e o `whitespace-pre-wrap`).
export function MentionText({ text, workspaceId, variant = 'default' }: MentionTextProps) {
  const entities = useMentionEntities(workspaceId)
  const navigate = useNavigate()
  const segments = parseMentions(text, entities)

  function targetFor(entity: MentionEntity) {
    if (entity.type === 'project') return `/projects/${entity.id}`
    if (entity.type === 'task') return `/tasks/${entity.id}`
    return undefined
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') return <span key={index}>{segment.value}</span>

        const target = targetFor(segment.entity)
        const className = cn(
          'rounded px-1 font-medium',
          variant === 'onAccent' ? 'bg-white/25 text-white' : 'bg-accent-soft text-accent',
          target && 'cursor-pointer',
        )

        if (!target) {
          return (
            <span key={index} className={className}>
              @{segment.label}
            </span>
          )
        }

        return (
          <span
            key={index}
            role="button"
            tabIndex={0}
            onClick={() => navigate(target)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(target)
              }
            }}
            className={className}
          >
            @{segment.label}
          </span>
        )
      })}
    </>
  )
}
