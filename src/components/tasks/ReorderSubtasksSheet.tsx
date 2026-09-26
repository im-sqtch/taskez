import { GripVertical, ListTodo } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { SortableItem, SortableList } from '@/components/ui/SortableList'
import { cn } from '@/lib/utils'
import { reorderItems } from '@/lib/reorder'
import { useDataStore } from '@/store/dataStore'
import type { Subtask } from '@/types'

interface ReorderSubtasksSheetProps {
  open: boolean
  onClose: () => void
  taskId: string
}

export function ReorderSubtasksSheet({ open, onClose, taskId }: ReorderSubtasksSheetProps) {
  const subtasks = useDataStore((s) => s.tasks.find((t) => t.id === taskId)?.subtasks)
  const reorderSubtasks = useDataStore((s) => s.reorderSubtasks)
  const [draft, setDraft] = useState<Subtask[]>([])

  // Não inclui `subtasks` nas deps: reiniciaria o rascunho a cada movimento
  // do usuário dentro da sheet (mesma ideia de ReorderTasksSheet).
  useEffect(() => {
    if (open) setDraft(subtasks ?? [])
  }, [open, taskId])

  function reorder(oldIndex: number, newIndex: number) {
    setDraft((prev) => reorderItems(prev, oldIndex, newIndex))
  }

  function handleSave() {
    reorderSubtasks(taskId, draft.map((s) => s.id))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ordenar Subtarefas"
      subtitle="Arraste as subtarefas para definir a ordem dentro da tarefa"
      footer={
        <Button size="sm" fullWidth onClick={handleSave}>
          Salvar Alterações
        </Button>
      }
    >
      <SortableList ids={draft.map((subtask) => subtask.id)} onReorder={reorder} className="flex flex-col gap-2">
        {draft.map((subtask) => (
          <SortableItem
            key={subtask.id}
            id={subtask.id}
            className="flex items-center gap-3 rounded-xl bg-surface p-3 transition-colors duration-300"
          >
            <GripVertical size={18} className="shrink-0 text-text-faint" aria-hidden="true" />

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
              <ListTodo size={18} />
            </div>

            <p
              className={cn(
                'min-w-0 flex-1 whitespace-pre-wrap text-sm font-medium text-text',
                subtask.done && 'line-through text-text-faint',
              )}
            >
              {subtask.title}
            </p>
          </SortableItem>
        ))}
      </SortableList>
    </Sheet>
  )
}
