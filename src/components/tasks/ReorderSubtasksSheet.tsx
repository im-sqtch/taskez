import { ChevronDown, ChevronUp, ListTodo } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
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
  const [highlightedId, setHighlightedId] = useState<string>()
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Não inclui `subtasks` nas deps: reiniciaria o rascunho a cada movimento
  // do usuário dentro da sheet (mesma ideia de ReorderTasksSheet).
  useEffect(() => {
    if (open) setDraft(subtasks ?? [])
    return () => clearTimeout(highlightTimer.current)
  }, [open, taskId])

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
    reorderSubtasks(taskId, draft.map((s) => s.id))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ordenar Subtarefas"
      subtitle="Defina a ordem das subtarefas desta tarefa"
      footer={
        <Button size="sm" fullWidth onClick={handleSave}>
          Salvar Alterações
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {draft.map((subtask, index) => (
          <div
            key={subtask.id}
            className={cn(
              'flex items-center gap-3 rounded-xl p-3 transition-colors duration-300',
              highlightedId === subtask.id ? 'bg-accent-soft' : 'bg-surface',
            )}
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
          </div>
        ))}
      </div>
    </Sheet>
  )
}
