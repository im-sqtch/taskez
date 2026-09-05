import { FolderKanban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatDate } from '@/lib/utils'
import { useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

export function ProjectsWidget({ size }: { size: WidgetSize }) {
  const allProjects = useWorkspaceProjects()
  const tasks = useWorkspaceTasks()
  const projects = allProjects.filter((p) => p.status === 'active')
  const navigate = useNavigate()

  function progressFor(projectId: string) {
    const projectTasks = tasks.filter((t) => t.projectId === projectId)
    if (projectTasks.length === 0) return 0
    return Math.round((projectTasks.filter((t) => t.status === 'done').length / projectTasks.length) * 100)
  }

  if (size === 'S') {
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
      ) : size === 'L' ? (
        <div className="flex flex-col gap-2.5">
          {projects.map((p) => {
            const progress = progressFor(p.id)
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex flex-col gap-2.5 rounded-xl border border-border-soft bg-surface p-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p.color }}>
                    <FolderKanban size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight text-text">{p.name}</p>
                    {p.dueDate && <p className="text-xs text-text-faint">Prazo: {formatDate(p.dueDate)}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-text-muted">{progress}%</span>
                </div>
                <ProgressBar value={progress} color={p.color} />
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
                className="flex w-52 shrink-0 flex-col gap-3 rounded-xl border border-border-soft bg-surface p-4 text-left"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: p.color }}
                >
                  <FolderKanban size={16} />
                </div>
                <div>
                  <p className="font-semibold leading-tight text-text">{p.name}</p>
                  {p.dueDate && <p className="mt-0.5 text-xs text-text-faint">Prazo: {formatDate(p.dueDate)}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <ProgressBar value={progress} color={p.color} />
                  <p className="text-xs font-medium text-text-muted">{progress}% concluído</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
