import { ChevronDown, ChevronUp, FolderKanban } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useDataStore } from '@/store/dataStore'
import type { Project } from '@/types'

interface ReorderProjectsSheetProps {
  open: boolean
  onClose: () => void
  projects: Project[]
}

export function ReorderProjectsSheet({ open, onClose, projects }: ReorderProjectsSheetProps) {
  const reorderProjects = useDataStore((s) => s.reorderProjects)
  const [draft, setDraft] = useState<Project[]>([])
  const [highlightedId, setHighlightedId] = useState<string>()
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Não inclui `projects` nas deps: a página devolve um array filtrado novo a
  // cada render, então reagir a ele reiniciaria o rascunho a cada movimento.
  useEffect(() => {
    if (open) setDraft(projects)
    return () => clearTimeout(highlightTimer.current)
  }, [open])

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= draft.length) return
    const movedId = draft[index]!.id
    setDraft((prev) => {
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!]
      return next
    })
    setHighlightedId(movedId)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightedId(undefined), 650)
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
          <div
            key={project.id}
            className={`flex items-center gap-3 rounded-xl p-3 transition-colors duration-300 ${
              highlightedId === project.id ? 'bg-accent-soft' : 'bg-surface'
            }`}
          >
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
