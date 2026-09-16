import { ListTodo } from 'lucide-react'
import { Outlet, useMatch } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { TasksPage } from './TasksPage'

export function TasksLayout() {
  const detailMatch = useMatch('/tasks/:id')
  const selectedId = detailMatch?.params.id
  const hasDetail = Boolean(selectedId)

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <div className={cn('lg:w-[380px] lg:shrink-0 lg:border-r lg:border-border-soft lg:pr-8', hasDetail && 'hidden lg:block')}>
        <TasksPage selectedId={selectedId} />
      </div>
      <div className={cn('min-w-0 flex-1', !hasDetail && 'hidden lg:flex lg:min-h-[60vh] lg:items-center lg:justify-center')}>
        {hasDetail ? (
          <Outlet />
        ) : (
          <EmptyState
            icon={<ListTodo size={28} />}
            title="Selecione uma tarefa"
            description="Escolha uma tarefa na lista para ver os detalhes aqui."
          />
        )}
      </div>
    </div>
  )
}
