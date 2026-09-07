import { Link2, Plus, X } from 'lucide-react'
import { FieldLabel } from '@/components/ui/Input'

function toHref(link: string) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`
}

interface LinksFieldProps {
  links: string[]
  onChange: (links: string[]) => void
  draft: string
  onDraftChange: (draft: string) => void
}

// Campo de edição: lista os links já adicionados (com botão de remover) e um input
// único para o próximo — ao colar ou confirmar um link, ele vai pra lista e o
// campo fica pronto de novo para receber outro. O rascunho (`draft`) fica no
// componente pai (ver TaskFormSheet/ProjectFormSheet) para que, se o usuário digitar
// ou colar um link e for direto no botão de salvar do formulário sem confirmar essa
// linha, o texto ainda seja incluído — sem isso ele se perdia silenciosamente.
export function LinksField({ links, onChange, draft, onDraftChange }: LinksFieldProps) {
  function commit(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    onChange([...links, trimmed])
    onDraftChange('')
  }

  function remove(index: number) {
    onChange(links.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Links (opcional)</FieldLabel>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5">
          <Link2 size={14} className="shrink-0 text-text-faint" />
          <span className="min-w-0 flex-1 truncate text-sm text-text">{link}</span>
          <button onClick={() => remove(i)} className="shrink-0 text-text-faint hover:text-danger" aria-label="Remover link">
            <X size={15} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (!pasted.trim()) return
            e.preventDefault()
            commit(pasted)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(draft)
            }
          }}
          placeholder="Cole ou digite um link"
          className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent"
        />
        <button
          onClick={() => commit(draft)}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-text-muted hover:text-accent"
          aria-label="Adicionar link"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

// Junta os links já confirmados com um rascunho ainda não confirmado (se houver
// texto nele) — usado no submit do formulário para não perder a última linha.
export function withDraft(links: string[], draft: string): string[] {
  const trimmed = draft.trim()
  return trimmed ? [...links, trimmed] : links
}

// Exibição somente-leitura, usada nas telas de visualização de tarefa e projeto.
export function LinksList({ links }: { links: string[] }) {
  if (links.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      {links.map((link, i) => (
        <a
          key={i}
          href={toHref(link)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-accent hover:underline"
        >
          <Link2 size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{link}</span>
        </a>
      ))}
    </div>
  )
}
