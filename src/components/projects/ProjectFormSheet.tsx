import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, TextArea } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import type { Project } from '@/types'

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
  const team = useDataStore((s) => s.team)
  const currentUser = useAuthStore((s) => s.currentUser())

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0]!)
  const [dueDate, setDueDate] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setColor(project?.color ?? COLORS[0]!)
    setDueDate(project?.dueDate ? project.dueDate.slice(0, 10) : '')
    setMemberIds(project?.memberIds ?? (currentUser ? ['team-1'] : []))
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
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="project-due">Prazo (opcional)</FieldLabel>
          <input
            id="project-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-13 rounded-2xl border border-border bg-surface px-3.5 text-sm text-text outline-none focus:border-accent"
          />
        </div>
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
  )
}
