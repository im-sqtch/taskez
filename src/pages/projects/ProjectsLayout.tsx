import { FolderKanban } from 'lucide-react'
import { Outlet, useMatch } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { ProjectsPage } from './ProjectsPage'

export function ProjectsLayout() {
  // `/*` no fim casa tanto com "/projects/:id" quanto com rotas mais profundas
  // (ex.: "/projects/:id/tasks/:taskId"), então o projeto continua destacado
  // na lista mesmo quando o painel direito está mostrando uma tarefa dele.
  const detailMatch = useMatch('/projects/:id/*')
  const selectedId = detailMatch?.params.id
  const hasDetail = Boolean(selectedId)

  return (
    <div className="w-full min-w-0 overflow-x-clip lg:flex lg:items-start lg:gap-8">
      <div className={cn('lg:w-[380px] lg:shrink-0 lg:border-r lg:border-border-soft lg:pr-8', hasDetail && 'hidden lg:block')}>
        <ProjectsPage selectedId={selectedId} />
      </div>
      <div className={cn('min-w-0 flex-1', !hasDetail && 'hidden lg:flex lg:min-h-[60vh] lg:items-center lg:justify-center')}>
        {hasDetail ? (
          <Outlet />
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
