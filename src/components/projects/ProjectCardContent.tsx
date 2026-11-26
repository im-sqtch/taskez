import { FolderKanban, Repeat } from 'lucide-react'
import { ProjectUnreadBadge } from '@/components/projects/ProjectUnreadBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types'

export function ProjectCardContent({ project, completed, total }: { project: Project; completed: number; total: number }) {
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="flex items-start gap-3">
      <div
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: project.color }}
      >
        <FolderKanban size={18} />
        <ProjectUnreadBadge projectId={project.id} />
      </div>
      <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 break-words font-semibold leading-5 text-text">
            {project.name}
            {project.recurrence && <Repeat size={12} className="ml-1.5 inline-block text-text-faint" aria-label="Recorrente" />}
          </p>
          <span className="shrink-0 text-xs font-semibold leading-5 text-text-muted">
            {completed} · {total} tarefas
          </span>
        </div>
        {project.dueDate && <p className="text-xs text-text-faint">Prazo: {formatDate(project.dueDate)}</p>}
        <ProgressBar value={progress} color={project.color} />
      </div>
    </div>
  )
}
