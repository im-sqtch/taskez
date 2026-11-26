import { FolderKanban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { ProjectCardContent } from '@/components/projects/ProjectCardContent'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { widgetContentSize } from '@/lib/widgetCatalog'
import { useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

export function ProjectsWidget({ size }: { size: WidgetSize }) {
  const content = widgetContentSize(size)
  // "Grande · Dividido" mostra a mesma lista do "Grande" (L/LH), só que em
  // duas colunas — por isso é um flag à parte, não uma variação de `content`.
  const split = size === 'LS'
  const allProjects = useWorkspaceProjects()
  const tasks = useWorkspaceTasks()
  const projects = allProjects.filter((p) => p.status === 'active')
  const navigate = useNavigate()

  function progressFor(projectId: string) {
    const projectTasks = tasks.filter((t) => t.projectId === projectId)
    const total = projectTasks.length
    const completed = projectTasks.filter((t) => t.status === 'done').length
    return { total, completed }
  }

  if (content === 'S') {
    return (
      <Card className="flex items-center justify-between" onClick={() => navigate('/projects')}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success">
            <FolderKanban size={16} />
          </div>
          <p className="font-semibold text-text">Projetos ativos</p>
        </div>
        <p className="text-lg font-bold text-text">{projects.length}</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="font-bold text-text">Projetos ativos</h3>
        <button onClick={() => navigate('/projects')} className="text-sm font-semibold text-accent">
          Ver todos
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban size={22} />} title="Nenhum projeto ativo" />
      ) : content === 'L' ? (
        <div className={cn('flex flex-col gap-2.5', split && 'lg:grid lg:grid-cols-2')}>
          {projects.map((p) => {
            const progress = progressFor(p.id)
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex flex-col gap-2.5 rounded-xl border border-border-soft bg-surface p-3.5 text-left"
              >
                <ProjectCardContent project={p} completed={progress.completed} total={progress.total} />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
          {projects.map((p) => {
            const progress = progressFor(p.id)
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex w-80 max-w-[calc(100vw-40px)] shrink-0 flex-col gap-3 rounded-xl border border-border-soft bg-surface p-4 text-left"
              >
                <ProjectCardContent project={p} completed={progress.completed} total={progress.total} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
