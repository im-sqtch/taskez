import { Check, File, FileText, Image, Paperclip } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/Sheet'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'

function iconFor(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf' || type.startsWith('text/')) return FileText
  return File
}

interface FindFileSheetProps {
  open: boolean
  onClose: () => void
  projectId: string
  excludeFileIds: string[]
}

export function FindFileSheet({ open, onClose, projectId, excludeFileIds }: FindFileSheetProps) {
  const project = useDataStore((s) => s.projects.find((p) => p.id === projectId))
  const allFiles = useDataStore((s) => s.files)
  const linkFileToProject = useDataStore((s) => s.linkFileToProject)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (open) setSelected([])
  }, [open])

  const candidates = allFiles
    .filter((f) => f.workspaceId === project?.workspaceId && !excludeFileIds.includes(f.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  function handleConfirm() {
    for (const id of selected) linkFileToProject(id, projectId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Encontrar arquivo"
      subtitle="Selecione arquivos já enviados ao workspace para vincular a este projeto"
      footer={
        <Button fullWidth size="lg" onClick={handleConfirm} disabled={selected.length === 0}>
          {selected.length === 0 ? 'Selecione um arquivo' : `Adicionar (${selected.length})`}
        </Button>
      }
    >
      {candidates.length === 0 ? (
        <EmptyState icon={<Paperclip size={22} />} title="Nenhum outro arquivo disponível" description="Todos os arquivos do workspace já estão neste projeto." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {candidates.map((file) => {
            const Icon = iconFor(file.type)
            const isSelected = selected.includes(file.id)
            return (
              <button
                key={file.id}
                onClick={() => toggle(file.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  isSelected ? 'bg-accent-soft' : 'bg-surface',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{file.name}</p>
                  <p className="text-xs text-text-faint">
                    {formatBytes(file.size)} · {formatDate(file.createdAt)}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-accent bg-accent text-white' : 'border-border text-transparent',
                  )}
                >
                  <Check size={14} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
