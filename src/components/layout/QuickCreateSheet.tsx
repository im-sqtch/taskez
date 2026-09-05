import { CheckSquare, FolderPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet'
import { Sheet } from '@/components/ui/Sheet'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { useUiStore } from '@/store/uiStore'

export function QuickCreateSheet() {
  const open = useUiStore((s) => s.quickCreateOpen)
  const close = useUiStore((s) => s.closeQuickCreate)
  const [mode, setMode] = useState<'menu' | 'task' | 'project'>('menu')
  const navigate = useNavigate()

  function handleClose() {
    close()
    setTimeout(() => setMode('menu'), 200)
  }

  return (
    <>
      <Sheet open={open && mode === 'menu'} onClose={handleClose} title="O que vamos criar?">
        <div className="flex flex-col gap-3 pb-2">
          <button
            onClick={() => setMode('task')}
            className="flex items-center gap-3.5 rounded-2xl bg-surface p-4 text-left transition-colors hover:bg-surface-hover"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <CheckSquare size={22} />
            </div>
            <div>
              <p className="font-semibold text-text">Nova tarefa</p>
              <p className="text-sm text-text-muted">Adicione algo à sua lista</p>
            </div>
          </button>
          <button
            onClick={() => setMode('project')}
            className="flex items-center gap-3.5 rounded-2xl bg-surface p-4 text-left transition-colors hover:bg-surface-hover"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
              <FolderPlus size={22} />
            </div>
            <div>
              <p className="font-semibold text-text">Novo projeto</p>
              <p className="text-sm text-text-muted">Organize um novo trabalho</p>
            </div>
          </button>
        </div>
      </Sheet>

      <TaskFormSheet open={open && mode === 'task'} onClose={handleClose} />
      <ProjectFormSheet
        open={open && mode === 'project'}
        onClose={handleClose}
        onCreated={(id) => navigate(`/projects/${id}`)}
      />
    </>
  )
}
