import { AnimatePresence, motion } from 'framer-motion'
import { Check, Circle, CircleCheck, CircleX, Copy, ExternalLink, Paperclip, Plus, Upload, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { FilePreviewDialog } from '@/components/files/FilePreviewDialog'
import { FileThumbnail } from '@/components/files/FileThumbnail'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DatePickerSheet } from '@/components/ui/DatePickerSheet'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { Sheet } from '@/components/ui/Sheet'
import { uploadTaskFile } from '@/lib/taskAttachments'
import {
  CHECKBOX_LABELS, asList, asText, columnType, formatDateKey, formatNumber, nextCheckbox, numberDraft, parseNumber, toHref, withOption,
} from '@/lib/taskTables'
import { cn, formatBytes } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { ProjectFile, TableCellValue, TableColumn, TableSelectOption, TeamMember } from '@/types'

// Dados do workspace que as células precisam para mostrar pessoas e arquivos.
export interface TableContext {
  taskId: string
  workspaceId: string
  members: TeamMember[]
  files: ProjectFile[]
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Navegadores sem a API de área de transferência (ou sem permissão).
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
}

const LONG_PRESS_MS = 500

// Em volta de cada célula: no desktop mostra o botão de copiar ao passar o
// mouse; no celular, segurar o dedo copia o valor. Nos dois, aparece "Copiado".
export function CopyableCell({ text, children }: { text: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const press = useRef<{ x: number; y: number; timer: number } | null>(null)
  const longPressed = useRef(false)
  const content = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    window.clearTimeout(hideTimer.current)
    if (press.current) window.clearTimeout(press.current.timer)
  }, [])

  async function copy() {
    if (!text) return
    await copyText(text)
    navigator.vibrate?.(10)
    setCopied(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setCopied(false), 1400)
  }

  function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }

  return (
    <div
      className="group relative flex h-full min-h-11 min-w-0 cursor-text items-center px-2 py-1 lg:min-h-9 [-webkit-touch-callout:none] [@media(hover:none)]:select-none"
      // Clique em qualquer parte da célula (fora do valor) também começa a edição.
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a, input, textarea, label')) return
        content.current?.querySelector<HTMLElement>('button, input, textarea')?.click()
      }}
      onPointerDown={(event) => {
        longPressed.current = false
        // Dentro de um campo em digitação, segurar o dedo serve para selecionar texto.
        if (event.pointerType !== 'touch' || !text || (event.target as HTMLElement).closest('input, textarea')) return
        cancelPress()
        press.current = {
          x: event.clientX,
          y: event.clientY,
          timer: window.setTimeout(() => { press.current = null; longPressed.current = true; void copy() }, LONG_PRESS_MS),
        }
      }}
      onPointerMove={(event) => {
        if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10) cancelPress()
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      // Depois de segurar, o toque não deve abrir o link ou o arquivo da célula.
      onClickCapture={(event) => { if (longPressed.current) { event.preventDefault(); event.stopPropagation(); longPressed.current = false } }}
      onContextMenu={(event) => { if (press.current || longPressed.current) event.preventDefault() }}
    >
      <div ref={content} className="min-w-0 flex-1 py-1">{children}</div>
      {text && (
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copiar valor"
          title="Copiar"
          // Sobreposto à direita do valor: aparecer não muda a largura da célula.
          className="absolute right-1 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-text-faint shadow-sm hover:text-accent focus-visible:flex focus-visible:outline-2 focus-visible:outline-accent [@media(hover:hover)]:group-hover:flex"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      )}
      <AnimatePresence>
        {copied && (
          <motion.span
            role="status"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
              <Check size={12} /> Copiado
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export function OptionChip({ option }: { option: TableSelectOption }) {
  return (
    <span
      className="inline-flex max-w-full shrink-0 items-center truncate rounded-md px-2 py-0.5 text-[13px] font-medium text-text"
      style={{ backgroundColor: `color-mix(in srgb, ${option.color} 32%, var(--color-surface))` }}
    >
      {option.name}
    </span>
  )
}

function CheckboxIcon({ value }: { value: string }) {
  if (value === 'done') return <CircleCheck size={20} fill="currentColor" className="text-success [&>path]:stroke-surface" />
  if (value === 'failed') return <CircleX size={20} fill="currentColor" className="text-danger [&>path]:stroke-surface" />
  return <Circle size={20} className="text-text-faint" />
}

function PersonChip({ member }: { member: TeamMember }) {
  return (
    <span className="inline-flex max-w-full shrink-0 items-center gap-1.5 text-sm text-text">
      <Avatar name={member.name} color={member.avatarColor} src={member.avatarUrl} size="xs" />
      <span className="truncate">{member.name}</span>
    </span>
  )
}

function optionsOf(column: TableColumn, value: TableCellValue | undefined) {
  return asList(value).map((id) => column.options?.find((option) => option.id === id)).filter((option): option is TableSelectOption => Boolean(option))
}

function membersOf(context: TableContext, value: TableCellValue | undefined) {
  return asList(value).map((id) => context.members.find((member) => member.id === id)).filter((member): member is TeamMember => Boolean(member))
}

function filesOf(context: TableContext, value: TableCellValue | undefined) {
  return asList(value).map((id) => context.files.find((file) => file.id === id)).filter((file): file is ProjectFile => Boolean(file))
}

interface TableCellProps {
  column: TableColumn
  value: TableCellValue | undefined
  context: TableContext
  // `nextColumn`: a coluna com uma opção nova criada na própria célula.
  onChange: (value: TableCellValue, nextColumn?: TableColumn) => void
  // Quebrar texto: a célula cresce na vertical em vez de cortar o conteúdo.
  wrap: boolean
}

// O fundo da célula nunca muda (nem ao passar o mouse, nem ao digitar).
const pickerClass = 'flex min-h-7 w-full min-w-0 items-center gap-1.5 text-left text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-accent'

// Célula da tabela: mostra o valor e, ao clicar, já permite alterá-lo (em
// qualquer modo). Copiar fica por conta da CopyableCell em volta.
export function TableCell({ column, value, context, onChange, wrap }: TableCellProps) {
  const type = columnType(column)
  const label = column.title || 'Coluna'
  const text = asText(value)
  switch (type) {
    case 'number':
    case 'usd':
    case 'brl':
      return <NumberCell type={type} value={text} label={label} onChange={onChange} />
    case 'select':
    case 'multiSelect':
      return <SelectCell column={column} value={value} multiple={type === 'multiSelect'} wrap={wrap} onChange={onChange} />
    case 'date':
      return <DateCell value={text} label={label} onChange={onChange} />
    case 'person':
      return <PersonCell value={asList(value)} label={label} context={context} wrap={wrap} onChange={onChange} />
    case 'files':
      return <FilesCell value={asList(value)} label={label} context={context} wrap={wrap} onChange={onChange} />
    case 'checkbox':
      return (
        <button
          type="button"
          onClick={() => onChange(nextCheckbox(text))}
          aria-label={`${label}: ${CHECKBOX_LABELS[text] ?? 'vazio'}. Alternar`}
          className="flex h-7 w-7 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <CheckboxIcon value={text} />
        </button>
      )
    case 'link':
      return <TextCell value={text} label={label} link wrap={wrap} onChange={onChange} />
    default:
      return <TextCell value={text} label={label} wrap={wrap} onChange={onChange} />
  }
}

const inlineInputClass = 'block w-full min-w-0 bg-transparent p-0 text-sm leading-5 text-text outline-none placeholder:text-text-faint'

// Texto e link: mostra o valor; ao clicar, vira campo de digitação no mesmo
// lugar. No texto, Shift+Enter pula linha e Enter conclui.
function TextCell({ value, label, link, wrap, onChange }: { value: string; label: string; link?: boolean; wrap: boolean; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing && link) {
    return (
      <input
        autoFocus
        type="url"
        inputMode="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur() }}
        placeholder="https://"
        aria-label={`${label}, linha`}
        className={inlineInputClass}
      />
    )
  }
  if (editing) return <TextAreaCell value={value} label={label} onChange={onChange} onDone={() => setEditing(false)} />
  return (
    <div className="flex min-h-5 min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Editar ${label}${value ? `: ${value}` : ''}`}
        className={cn(
          'block min-h-5 min-w-0 flex-1 text-left text-sm leading-5 outline-none focus-visible:outline-2 focus-visible:outline-accent',
          link ? 'text-accent' : 'text-text',
          wrap ? (link ? 'break-all' : 'whitespace-pre-wrap break-words') : 'truncate',
        )}
      >
        {value}
      </button>
      {link && value && (
        <a href={toHref(value)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${value}`} title="Abrir link" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-accent">
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  )
}

// Campo de texto da célula: cresce na vertical conforme o conteúdo.
function TextAreaCell({ value, label, onChange, onDone }: { value: string; label: string; onChange: (value: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const area = ref.current
    if (!area) return
    area.style.height = '0px'
    area.style.height = `${area.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      autoFocus
      rows={1}
      value={value}
      onFocus={(event) => { const end = event.currentTarget.value.length; event.currentTarget.setSelectionRange(end, end) }}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onDone}
      onKeyDown={(event) => {
        // Shift+Enter pula linha (comportamento padrão do campo); Enter sozinho conclui.
        if ((event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) || event.key === 'Escape') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      aria-label={`${label}, linha`}
      className={cn(inlineInputClass, 'resize-none overflow-hidden whitespace-pre-wrap break-words')}
    />
  )
}

// Número, dólar e real: mostra formatado; ao clicar, edita o número.
function NumberCell({ type, value, label, onChange }: { type: 'number' | 'usd' | 'brl'; value: string; label: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const prefix = type === 'usd' ? 'US$' : type === 'brl' ? 'R$' : null

  function commit() {
    const text = draft ?? ''
    setDraft(null)
    if (!text.trim()) {
      if (value) onChange('')
      return
    }
    const parsed = parseNumber(text)
    // Valor que não é número: fica o último válido.
    if (parsed !== null && parsed !== value) onChange(parsed)
  }

  if (draft !== null) {
    return (
      <label className="flex min-w-0 items-center gap-1">
        {prefix && <span className="text-sm leading-5 text-text-faint">{prefix}</span>}
        <input
          autoFocus
          value={draft}
          inputMode="decimal"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setDraft(null) }}
          placeholder={type === 'usd' ? '0.00' : '0,00'}
          aria-label={`${label}, linha`}
          className={cn(inlineInputClass, 'min-w-0 text-right tabular-nums')}
        />
      </label>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setDraft(numberDraft(type, value))}
      aria-label={`Editar ${label}${value ? `: ${formatNumber(type, value)}` : ''}`}
      className="block min-h-5 w-full min-w-0 truncate text-right text-sm leading-5 tabular-nums text-text outline-none focus-visible:outline-2 focus-visible:outline-accent"
    >
      {value && formatNumber(type, value)}
    </button>
  )
}

function SelectCell({ column, value, multiple, wrap, onChange }: { column: TableColumn; value: TableCellValue | undefined; multiple: boolean; wrap: boolean; onChange: TableCellProps['onChange'] }) {
  const selected = asList(value)
  const chosen = optionsOf(column, value)
  return (
    <DropdownMenu
      label={column.title || 'Opções'}
      blockTrigger
      renderTrigger={({ open, toggle }) => (
        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`${column.title || 'Coluna'}: escolher opção`} className={pickerClass}>
          <span className={cn('flex min-w-0 flex-1 gap-1.5', wrap ? 'flex-wrap' : 'overflow-hidden')}>
            {chosen.map((option) => <OptionChip key={option.id} option={option} />)}
          </span>
        </button>
      )}
    >
      {(close) => (
        <OptionPicker
          column={column}
          selected={selected}
          multiple={multiple}
          onPick={(id, nextColumn) => {
            if (multiple) onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id], nextColumn)
            else {
              onChange(selected[0] === id ? '' : id, nextColumn)
              close()
            }
          }}
          onClear={() => { onChange(multiple ? [] : ''); close() }}
        />
      )}
    </DropdownMenu>
  )
}

// Painel do select: busca, escolhe ou cria uma opção (como no Notion).
function OptionPicker({ column, selected, multiple, onPick, onClear }: {
  column: TableColumn
  selected: string[]
  multiple: boolean
  onPick: (id: string, nextColumn?: TableColumn) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const options = column.options ?? []
  const term = query.trim().toLocaleLowerCase('pt-BR')
  const visible = term ? options.filter((option) => option.name.toLocaleLowerCase('pt-BR').includes(term)) : options
  const exact = options.some((option) => option.name.trim().toLocaleLowerCase('pt-BR') === term)

  function create() {
    if (!query.trim()) return
    const { column: nextColumn, option } = withOption(column, query)
    setQuery('')
    onPick(option.id, nextColumn)
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          if (visible.length === 1 && term) { onPick(visible[0]!.id); setQuery('') }
          else if (!exact) create()
        }}
        placeholder="Buscar ou criar opção"
        aria-label="Buscar ou criar opção"
        className="mb-1 h-10 w-full rounded-xl border border-border bg-base px-3 text-sm text-text outline-none placeholder:text-text-faint focus:border-accent"
      />
      {visible.map((option) => {
        const isSelected = selected.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            role={multiple ? 'menuitemcheckbox' : 'menuitemradio'}
            aria-checked={isSelected}
            onClick={() => onPick(option.id)}
            className={cn('flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-surface-alt', isSelected && 'bg-accent-soft')}
          >
            <span className="min-w-0 flex-1"><OptionChip option={option} /></span>
            {isSelected && <Check size={14} className="shrink-0 text-accent" />}
          </button>
        )
      })}
      {term && !exact && (
        <button type="button" role="menuitem" onClick={create} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm font-semibold text-text hover:bg-surface-alt hover:text-accent">
          <Plus size={14} className="shrink-0" /> <span className="truncate">Criar “{query.trim()}”</span>
        </button>
      )}
      {!term && options.length === 0 && <p className="px-2.5 py-2 text-xs text-text-faint">Digite para criar a primeira opção.</p>}
      {selected.length > 0 && !term && (
        <button type="button" role="menuitem" onClick={onClear} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm font-semibold text-text-muted hover:bg-surface-alt hover:text-danger">
          <X size={14} className="shrink-0" /> Limpar
        </button>
      )}
    </div>
  )
}

function DateCell({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${label}: escolher data`} className={pickerClass}>
        <span className="flex-1 tabular-nums">{value && formatDateKey(value)}</span>
      </button>
      <DatePickerSheet open={open} onClose={() => setOpen(false)} title={label} value={value} onChange={onChange} />
    </>
  )
}

function PersonCell({ value, label, context, wrap, onChange }: { value: string[]; label: string; context: TableContext; wrap: boolean; onChange: (value: string[]) => void }) {
  const chosen = membersOf(context, value)
  return (
    <DropdownMenu
      label={label}
      blockTrigger
      renderTrigger={({ open, toggle }) => (
        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: escolher pessoas`} className={pickerClass}>
          <span className={cn('flex min-w-0 flex-1 gap-x-3 gap-y-1.5', wrap ? 'flex-wrap' : 'overflow-hidden')}>
            {chosen.map((member) => <PersonChip key={member.id} member={member} />)}
          </span>
        </button>
      )}
    >
      {() => (
        <>
          {context.members.length === 0 && <p className="px-2.5 py-2 text-xs text-text-faint">Nenhuma pessoa no workspace.</p>}
          {context.members.map((member) => {
            const isSelected = value.includes(member.id)
            return (
              <button
                key={member.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isSelected}
                onClick={() => onChange(isSelected ? value.filter((id) => id !== member.id) : [...value, member.id])}
                className={cn('flex min-h-11 w-full items-center gap-2.5 rounded-xl p-2 text-left text-text transition-colors hover:bg-surface-alt', isSelected && 'bg-accent-soft')}
              >
                <Avatar name={member.name} color={member.avatarColor} src={member.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.name}</span>
                {isSelected && <Check size={14} className="shrink-0 text-accent" />}
              </button>
            )
          })}
        </>
      )}
    </DropdownMenu>
  )
}

function FilesCell({ value, label, context, wrap, onChange }: { value: string[]; label: string; context: TableContext; wrap: boolean; onChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const chosen = filesOf(context, value)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${label}: arquivos`} className={pickerClass}>
        <span className={cn('flex min-w-0 flex-1 gap-1.5', wrap ? 'flex-wrap' : 'overflow-hidden')}>
          {chosen.map((file) => (
            <span key={file.id} className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-[13px] font-medium text-text">
              <Paperclip size={12} className="shrink-0" />
              <span className="truncate">{file.name}</span>
            </span>
          ))}
        </span>
      </button>
      <FilesSheet open={open} onClose={() => setOpen(false)} title={label} value={value} context={context} onChange={onChange} />
    </>
  )
}

// Sheet da coluna "Arquivos": envia um arquivo novo ou escolhe um do workspace.
function FilesSheet({ open, onClose, title, value, context, onChange }: {
  open: boolean
  onClose: () => void
  title: string
  value: string[]
  context: TableContext
  onChange: (value: string[]) => void
}) {
  const user = useAuthStore((s) => s.currentUser())
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  // Mantém a lista atual entre envios seguidos (o valor da prop só chega no próximo render).
  const latest = useRef(value)
  useEffect(() => { latest.current = value }, [value])
  const chosen = filesOf(context, value)
  const term = query.trim().toLocaleLowerCase('pt-BR')
  const available = context.files
    .filter((file) => !value.includes(file.id) && (!term || file.name.toLocaleLowerCase('pt-BR').includes(term)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!user || selected.length === 0) return
    setError(null)
    setUploading(true)
    for (const file of selected) {
      const result = await uploadTaskFile(file, { taskId: context.taskId, workspaceId: context.workspaceId, userId: user.id })
      if ('error' in result) setError(result.error)
      else {
        latest.current = [...latest.current, result.fileId]
        onChange(latest.current)
      }
    }
    setUploading(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle="Arquivos desta célula">
      <div className="flex flex-col gap-4">
        <input ref={inputRef} type="file" multiple onChange={handleFiles} className="hidden" />
        <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Enviando…' : 'Enviar arquivo'}
        </Button>
        {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
        {chosen.length > 0 && (
          <div className="flex flex-col gap-2">
            {chosen.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                <button type="button" onClick={() => setPreviewIndex(chosen.indexOf(file))} aria-label={`Visualizar ${file.name}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-accent">
                  <FileThumbnail file={file} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text hover:text-accent">{file.name}</p><p className="text-xs text-text-faint">{formatBytes(file.size)}</p></div>
                </button>
                <button type="button" onClick={() => onChange(value.filter((id) => id !== file.id))} aria-label={`Remover ${file.name} da célula`} className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Arquivos do workspace</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar arquivo"
            aria-label="Buscar arquivo do workspace"
            className="h-11 w-full rounded-2xl border border-border bg-surface px-3.5 text-sm text-text outline-none placeholder:text-text-faint focus:border-accent"
          />
          {available.length === 0 && <p className="py-2 text-sm text-text-muted">{term ? 'Nenhum arquivo encontrado.' : 'Nenhum outro arquivo no workspace.'}</p>}
          {available.map((file) => (
            <button key={file.id} type="button" onClick={() => onChange([...value, file.id])} className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-surface">
              <FileThumbnail file={file} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{file.name}</span>
              <Plus size={16} className="shrink-0 text-text-faint" />
            </button>
          ))}
        </div>
      </div>
      <FilePreviewDialog files={chosen} index={previewIndex} onIndexChange={setPreviewIndex} />
    </Sheet>
  )
}
