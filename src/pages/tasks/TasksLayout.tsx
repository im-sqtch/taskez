import { ListTodo } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { DetailListLayout } from '@/components/layout/ListCollapseButton'
import { TasksPage } from './TasksPage'

export function TasksLayout() {
  const detailMatch = useMatch('/tasks/:id')
  const selectedId = detailMatch?.params.id
  const hasDetail = Boolean(selectedId)
  const [taskListCollapsed, setTaskListCollapsed] = useState(false)
  const { pathname } = useLocation()
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="w-full min-w-0 overflow-x-clip lg:flex lg:h-full lg:min-h-0 lg:gap-8">
      <div data-scroll-pane="tasks-list" className={cn('lg:h-full lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-border-soft lg:pr-8 lg:pb-8', hasDetail && (taskListCollapsed ? 'hidden' : 'hidden lg:block'))}>
        <TasksPage selectedId={selectedId} />
      </div>
      <div ref={detailRef} data-scroll-pane="tasks-detail" className={cn('min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-8', !hasDetail && 'hidden lg:flex lg:min-h-[60vh] lg:items-center lg:justify-center')}>
        {hasDetail ? (
          <Outlet context={{ toggleList: () => setTaskListCollapsed((collapsed) => !collapsed), listCollapsed: taskListCollapsed, listName: 'tarefas' } satisfies DetailListLayout} />
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
