import { Bell, FolderPlus, ListPlus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'
import type { WidgetSize } from '@/types'

// Único tamanho disponível por enquanto (allowedSizes: ['M'] no catálogo),
// então o prop `size` ainda não influencia o layout aqui.
export function ShortcutsWidget(_props: { size: WidgetSize }) {
  const openSearch = useUiStore((s) => s.openSearch)
  const openNotifications = useUiStore((s) => s.openNotifications)
  const navigate = useNavigate()
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [projectFormOpen, setProjectFormOpen] = useState(false)

  const actions = [
    { label: 'Nova Tarefa', icon: ListPlus, tone: 'text-accent bg-accent-soft', onClick: () => setTaskFormOpen(true) },
    { label: 'Novo Projeto', icon: FolderPlus, tone: 'text-success bg-success-soft', onClick: () => setProjectFormOpen(true) },
    { label: 'Buscar', icon: Search, tone: 'text-text-muted bg-surface-alt', onClick: openSearch },
    { label: 'Notificações', icon: Bell, tone: 'text-warning bg-warning-soft', onClick: openNotifications },
  ]

  return (
    <>
      <Card>
        <h3 className="mb-3.5 font-bold text-text">Ações rápidas</h3>
        <div className="grid grid-cols-4 gap-3">
          {actions.map((action) => (
            <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-1.5">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', action.tone)}>
                <action.icon size={19} />
              </div>
              <span className="text-center text-[11px] font-medium leading-tight text-text-muted">{action.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <TaskFormSheet open={taskFormOpen} onClose={() => setTaskFormOpen(false)} />
      <ProjectFormSheet
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        onCreated={(id) => navigate(`/projects/${id}`)}
      />
    </>
  )
}
