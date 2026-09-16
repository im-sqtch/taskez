import { ChevronDown, ChevronUp, ListTodo } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
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
  const [highlightedId, setHighlightedId] = useState<string>()
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Não inclui `tasks` nas deps: a página pode devolver um array novo a cada
  // render, o que reiniciaria o rascunho a cada movimento do usuário.
  useEffect(() => {
    if (open) setDraft(tasks)
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
          <div
            key={task.id}
            className={`flex items-center gap-3 rounded-xl p-3 transition-colors duration-300 ${
              highlightedId === task.id ? 'bg-accent-soft' : 'bg-surface'
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
