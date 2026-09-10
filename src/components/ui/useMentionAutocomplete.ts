import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { applyMention, filterMentionEntities, findMentionQuery } from '@/lib/mentions'
import type { MentionEntity, MentionQuery } from '@/lib/mentions'
import { useDataStore } from '@/store/dataStore'

// Tudo que pode ser mencionado dentro de um workspace. Filtra no corpo do hook
// (não dentro do seletor do zustand): um `.filter()` ali criaria um array novo a
// cada notificação da store e entraria em loop de re-render.
export function useMentionEntities(workspaceId: string | undefined): MentionEntity[] {
  const projects = useDataStore((s) => s.projects)
  const tasks = useDataStore((s) => s.tasks)
  const team = useDataStore((s) => s.team)
  const files = useDataStore((s) => s.files)

  if (!workspaceId) return []

  return [
    ...projects.filter((p) => p.workspaceId === workspaceId).map((p) => ({ type: 'project' as const, id: p.id, name: p.name, color: p.color })),
    ...tasks.filter((t) => t.workspaceId === workspaceId).map((t) => ({ type: 'task' as const, id: t.id, name: t.title })),
    ...team.filter((m) => m.workspaceId === workspaceId).map((m) => ({ type: 'member' as const, id: m.id, name: m.name, color: m.avatarColor })),
    ...files.filter((f) => f.workspaceId === workspaceId).map((f) => ({ type: 'file' as const, id: f.id, name: f.name })),
  ]
}

interface Options {
  value: string
  onChange: (value: string) => void
  workspaceId: string | undefined
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function useMentionAutocomplete({ value, onChange, workspaceId, textareaRef }: Options) {
  const entities = useMentionEntities(workspaceId)
  const [mention, setMention] = useState<MentionQuery | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pendingCaret, setPendingCaret] = useState<number | null>(null)
  // Texto exato logo após uma escolha no dropdown. Enquanto nada mudar, o
  // dropdown fica fechado: "@Nome " ainda casa como busca ativa, e sem isso ele
  // reabriria sozinho e o próximo Enter escolheria a menção de novo em vez de
  // enviar a mensagem / quebrar a linha.
  const justInsertedRef = useRef<string | null>(null)

  const items = mention ? filterMentionEntities(entities, mention.query) : []
  const open = mention !== null && items.length > 0
  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0))

  // Depois de inserir o nome escolhido, devolve o cursor para logo após a menção.
  useEffect(() => {
    if (pendingCaret === null) return
    const el = textareaRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(pendingCaret, pendingCaret)
    }
    setPendingCaret(null)
  }, [pendingCaret, textareaRef])

  // Relê a posição do cursor no DOM para saber se ainda estamos dentro de um "@".
  function sync() {
    const el = textareaRef.current
    if (!el) return
    if (justInsertedRef.current === el.value) {
      setMention(null)
      return
    }
    justInsertedRef.current = null
    setMention(findMentionQuery(el.value, el.selectionStart ?? el.value.length))
    setActiveIndex(0)
  }

  function close() {
    setMention(null)
  }

  function select(entity: MentionEntity) {
    if (!mention) return
    const result = applyMention(value, mention, entity)
    onChange(result.text)
    setMention(null)
    setPendingCaret(result.caret)
    justInsertedRef.current = result.text
  }

  // Devolve `true` quando o dropdown consumiu a tecla — quem chama usa isso para
  // não disparar o comportamento normal (ex.: Enter enviando a mensagem).
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!open) return false
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % items.length)
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + items.length) % items.length)
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      select(items[safeIndex] ?? items[0]!)
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return true
    }
    return false
  }

  return { open, items, activeIndex: safeIndex, setActiveIndex, select, sync, close, handleKeyDown }
}
