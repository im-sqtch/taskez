import { GripVertical, ListTodo } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { SortableItem, SortableList } from '@/components/ui/SortableList'
import { cn } from '@/lib/utils'
import { reorderItems } from '@/lib/reorder'
import { useDataStore } from '@/store/dataStore'
import type { Task } from '@/types'

interface ReorderTasksSheetProps {
  open: boolean
  onClose: () => void
  tasks: Task[]
}

export function ReorderTasksSheet({ open, onClose, tasks }: ReorderTasksSheetProps) {
  const reorderTasks = useDataStore((s) => s.reorderTasks)
  const [draft, setDraft] = useState<Task[]>([])

  // Não inclui `tasks` nas deps: a página pode devolver um array novo a cada
  // render, o que reiniciaria o rascunho a cada movimento do usuário.
  useEffect(() => {
    if (open) setDraft(tasks)
  }, [open])

  function reorder(oldIndex: number, newIndex: number) {
    setDraft((prev) => reorderItems(prev, oldIndex, newIndex))
  }

  function handleSave() {
    reorderTasks(draft.map((t) => t.id))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ordenar Tarefas"
      subtitle="Arraste as tarefas para definir a ordem dentro do projeto"
      footer={
        <Button size="sm" fullWidth onClick={handleSave}>
          Salvar Alterações
        </Button>
      }
    >
      <SortableList ids={draft.map((task) => task.id)} onReorder={reorder} className="flex flex-col gap-2">
        {draft.map((task) => (
          <SortableItem
            key={task.id}
            id={task.id}
            className="flex items-center gap-3 rounded-xl bg-surface p-3 transition-colors duration-300"
          >
            <GripVertical size={18} className="shrink-0 text-text-faint" aria-hidden="true" />

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
              <ListTodo size={18} />
            </div>

            <p
              className={cn(
                'min-w-0 flex-1 truncate text-sm font-medium text-text',
                task.status === 'done' && 'line-through text-text-faint',
              )}
            >
              {task.title}
            </p>
          </SortableItem>
        ))}
      </SortableList>
    </Sheet>
  )
}
