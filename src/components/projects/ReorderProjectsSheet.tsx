import { ChevronDown, ChevronUp, FolderKanban } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useDataStore, useWorkspaceProjects } from '@/store/dataStore'
import type { Project } from '@/types'

interface ReorderProjectsSheetProps {
  open: boolean
  onClose: () => void
}

export function ReorderProjectsSheet({ open, onClose }: ReorderProjectsSheetProps) {
  const projects = useWorkspaceProjects()
  const reorderProjects = useDataStore((s) => s.reorderProjects)
  const [draft, setDraft] = useState<Project[]>([])

  // Não inclui `projects` nas deps: o hook devolve um array novo a cada render
  // (filter + sort), então reagir a ele reiniciaria o rascunho a cada movimento
  // do usuário dentro da sheet.
  useEffect(() => {
    if (open) setDraft(projects)
  }, [open])

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= draft.length) return
    setDraft((prev) => {
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!]
      return next
    })
  }

  function handleSave() {
    reorderProjects(draft.map((p) => p.id))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ordenar Projetos"
      subtitle="Defina a ordem dos projetos na lista e no dashboard"
      footer={
        <Button size="sm" fullWidth onClick={handleSave}>
          Salvar Alterações
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {draft.map((project, index) => (
          <div key={project.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
            <div className="flex flex-col">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="flex h-6 w-6 items-center justify-center text-text-faint disabled:opacity-30"
                aria-label="Mover para cima"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === draft.length - 1}
                className="flex h-6 w-6 items-center justify-center text-text-faint disabled:opacity-30"
                aria-label="Mover para baixo"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: project.color }}
            >
              <FolderKanban size={18} />
            </div>

            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{project.name}</p>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
