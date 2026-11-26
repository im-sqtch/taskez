import { FolderKanban } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { DetailListLayout } from '@/components/layout/ListCollapseButton'
import { ProjectsPage } from './ProjectsPage'

export function ProjectsLayout() {
  // `/*` no fim casa tanto com "/projects/:id" quanto com rotas mais profundas
  // (ex.: "/projects/:id/tasks/:taskId"), então o projeto continua destacado
  // na lista mesmo quando o painel direito está mostrando uma tarefa dele.
  const detailMatch = useMatch('/projects/:id/*')
  const selectedId = detailMatch?.params.id
  const hasDetail = Boolean(selectedId)
  const [projectListCollapsed, setProjectListCollapsed] = useState(false)
  const { pathname } = useLocation()
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="w-full min-w-0 overflow-x-clip lg:flex lg:h-full lg:min-h-0 lg:gap-8">
      <div data-scroll-pane="projects-list" className={cn('lg:h-full lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-border-soft lg:pr-8 lg:pb-8', hasDetail && (projectListCollapsed ? 'hidden' : 'hidden lg:block'))}>
        <ProjectsPage selectedId={selectedId} />
      </div>
      <div ref={detailRef} data-scroll-pane="projects-detail" className={cn('min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-8', !hasDetail && 'hidden lg:flex lg:min-h-[60vh] lg:items-center lg:justify-center')}>
        {hasDetail ? (
          <Outlet context={{ toggleList: () => setProjectListCollapsed((collapsed) => !collapsed), listCollapsed: projectListCollapsed, listName: 'projetos' } satisfies DetailListLayout} />
        ) : (
          <EmptyState
            icon={<FolderKanban size={28} />}
            title="Selecione um projeto"
            description="Escolha um projeto na lista para ver os detalhes aqui."
          />
        )}
      </div>
    </div>
  )
}
