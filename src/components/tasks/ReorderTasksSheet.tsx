import { ChevronDown, ChevronUp, ListTodo } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/dataStore'
import type { Task } from '@/types'

interface ReorderTasksSheetProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function ReorderTasksSheet({ open, onClose, projectId }: ReorderTasksSheetProps) {
  const tasks = useDataStore((s) => s.tasks)
  const reorderTasks = useDataStore((s) => s.reorderTasks)
  const [draft, setDraft] = useState<Task[]>([])

  // Não inclui `tasks` nas deps: filtrar/ordenar de novo a cada render
  // reiniciaria o rascunho a cada movimento do usuário dentro da sheet.
  useEffect(() => {
    if (open) {
      setDraft(
        tasks.filter((t) => t.projectId === projectId).sort((a, b) => a.order - b.order),
      )
    }
  }, [open, projectId])

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
    reorderTasks(draft.map((t) => t.id))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ordenar Tarefas"
      subtitle="Defina a ordem das tarefas deste projeto"
      footer={
        <Button size="sm" fullWidth onClick={handleSave}>
          Salvar Alterações
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {draft.map((task, index) => (
          <div key={task.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
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
          </div>
        ))}
      </div>
    </Sheet>
  )
}
