import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, TextArea } from '@/components/ui/Input'
import { LinksField, withDraft } from '@/components/ui/LinksField'
import { RecurrenceField } from '@/components/ui/RecurrenceField'
import { Sheet } from '@/components/ui/Sheet'
import { WEEKDAY_LABELS, addMonths, dateKey, formatMonthTitle, keyToDate, monthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { useDataStore, useWorkspaceTeam } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import type { Project, RecurrenceRule } from '@/types'

function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(keyToDate(key)).replace('.', '')
}

interface ProjectFormSheetProps {
  open: boolean
  onClose: () => void
  project?: Project
  onCreated?: (id: string) => void
}

const COLORS = ['#7C5CFF', '#3B9EFF', '#34D399', '#F5A524', '#F5455C', '#FF7CE0']

export function ProjectFormSheet({ open, onClose, project, onCreated }: ProjectFormSheetProps) {
  const addProject = useDataStore((s) => s.addProject)
  const updateProject = useDataStore((s) => s.updateProject)
  const team = useWorkspaceTeam()
  const currentUser = useAuthStore((s) => s.currentUser())

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0]!)
  const [dueDate, setDueDate] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [linkDraft, setLinkDraft] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined)
  const [dueSheetOpen, setDueSheetOpen] = useState(false)
  const [calendarCursor, setCalendarCursor] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setColor(project?.color ?? COLORS[0]!)
    setDueDate(project?.dueDate ? project.dueDate.slice(0, 10) : '')
    setCalendarCursor(project?.dueDate ? keyToDate(project.dueDate.slice(0, 10)) : new Date())
    const selfId = team.find((m) => m.isSelf)?.id
    setMemberIds(project?.memberIds ?? (currentUser && selfId ? [selfId] : []))
    setLinks(project?.links ?? [])
    setLinkDraft('')
    setRecurrence(project?.recurrence)
    // `team` de propósito fora das deps: useWorkspaceTeam() devolve um array novo a
    // cada render, e incluí-lo aqui resetaria a seleção do usuário a cada re-render
    // enquanto o sheet está aberto.
  }, [open, project, currentUser])

  function toggleMember(memberId: string) {
    setMemberIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  function handleSubmit() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      memberIds,
      links: withDraft(links, linkDraft),
      recurrence,
    }
    if (project) {
      updateProject(project.id, payload)
      onClose()
    } else {
      const id = addProject({
        ...payload,
        status: 'active',
      })
      onClose()
      onCreated?.(id)
    }
  }

  return (
    <>
    <Sheet
      open={open}
      onClose={onClose}
      title={project ? 'Editar projeto' : 'Novo projeto'}
      footer={
        <Button fullWidth size="lg" onClick={handleSubmit} disabled={!name.trim()}>
          {project ? 'Salvar alterações' : 'Criar projeto'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Nome do projeto"
          placeholder="Ex: Lançamento do produto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <TextArea
          label="Descrição (opcional)"
          placeholder="Do que se trata este projeto?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <LinksField links={links} onChange={setLinks} draft={linkDraft} onDraftChange={setLinkDraft} />
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Prazo (opcional)</FieldLabel>
          <button
            type="button"
            onClick={() => setDueSheetOpen(true)}
            className="flex h-13 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-left text-sm text-text outline-none transition-colors focus:border-accent"
          >
            <CalendarIcon size={16} className="shrink-0 text-text-faint" />
            <span className={cn('flex-1 truncate', !dueDate && 'text-text-faint')}>
              {dueDate ? formatShortDate(dueDate) : 'Nenhum'}
            </span>
          </button>
        </div>
        <RecurrenceField value={recurrence} onChange={setRecurrence} />
        <div className="flex flex-col gap-2">
          <FieldLabel>Cor</FieldLabel>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
                style={{ backgroundColor: c }}
                aria-label={c}
              >
                {color === c && <Check size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Convidar membros</FieldLabel>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {team.map((member) => {
              const selected = memberIds.includes(member.id)
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="relative">
                    <Avatar
                      name={member.name}
                      color={member.avatarColor}
                      size="md"
                      className={cn(!selected && 'opacity-40', selected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface-alt')}
                    />
                    {selected && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent ring-2 ring-surface-alt">
                        <Check size={10} className="text-white" />
                      </span>
                    )}
                  </div>
                  <span className={cn('max-w-14 truncate text-[11px] font-medium', selected ? 'text-accent' : 'text-text-faint')}>
                    {member.name.split(' ')[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Sheet>

    <Sheet
      open={dueSheetOpen}
      onClose={() => setDueSheetOpen(false)}
      title="Prazo"
      headerAction={
        dueDate ? (
          <button
            onClick={() => {
              setDueDate('')
              setDueSheetOpen(false)
            }}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-danger"
          >
            Remover
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text">{formatMonthTitle(calendarCursor)}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCalendarCursor((c) => addMonths(c, -1))}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCalendarCursor((c) => addMonths(c, 1))}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-text"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-text-faint">
              {label}
            </span>
          ))}
          {monthGrid(calendarCursor).map((date) => {
            const key = dateKey(date)
            const selected = key === dueDate
            const muted = date.getMonth() !== calendarCursor.getMonth()
            return (
              <button
                key={key}
                onClick={() => {
                  setDueDate(key)
                  setDueSheetOpen(false)
                }}
                className="flex items-center justify-center py-1"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                    selected && 'bg-accent font-bold text-white',
                    !selected && muted && 'text-text-faint',
                    !selected && !muted && 'font-medium text-text',
                  )}
                >
                  {date.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
    </>
  )
}
