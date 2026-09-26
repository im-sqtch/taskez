import { FolderKanban, GripVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { SortableItem, SortableList } from '@/components/ui/SortableList'
import { reorderItems } from '@/lib/reorder'
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

  // Não inclui `projects` nas deps: a página devolve um array filtrado novo a
  // cada render, então reagir a ele reiniciaria o rascunho a cada movimento.
  useEffect(() => {
    if (open) setDraft(projects)
  }, [open])

  function reorder(oldIndex: number, newIndex: number) {
    setDraft((prev) => reorderItems(prev, oldIndex, newIndex))
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
      subtitle="Arraste os projetos para definir a ordem na lista e no dashboard"
      footer={
        <Button size="sm" fullWidth onClick={handleSave}>
          Salvar Alterações
        </Button>
      }
    >
      <SortableList ids={draft.map((project) => project.id)} onReorder={reorder} className="flex flex-col gap-2">
        {draft.map((project) => (
          <SortableItem
            key={project.id}
            id={project.id}
            className="flex items-center gap-3 rounded-xl bg-surface p-3 transition-colors duration-300"
          >
            <GripVertical size={18} className="shrink-0 text-text-faint" aria-hidden="true" />

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: project.color }}
            >
              <FolderKanban size={18} />
            </div>

            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{project.name}</p>
          </SortableItem>
        ))}
      </SortableList>
    </Sheet>
  )
}
