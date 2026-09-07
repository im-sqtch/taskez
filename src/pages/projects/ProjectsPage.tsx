import { FolderKanban, Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet'
import { ReorderProjectsSheet } from '@/components/projects/ReorderProjectsSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn, formatDate } from '@/lib/utils'
import { useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import type { ProjectStatus } from '@/types'

const filters: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'archived', label: 'Arquivados' },
]

export function ProjectsPage() {
  const projects = useWorkspaceProjects()
  const tasks = useWorkspaceTasks()
  const [filter, setFilter] = useState<ProjectStatus>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const navigate = useNavigate()

  const filtered = useMemo(() => projects.filter((p) => p.status === filter), [projects, filter])

  function progressFor(projectId: string) {
    const projectTasks = tasks.filter((t) => t.projectId === projectId)
    if (projectTasks.length === 0) return { pct: 0, total: 0 }
    return {
      pct: Math.round((projectTasks.filter((t) => t.status === 'done').length / projectTasks.length) * 100),
      total: projectTasks.length,
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-2xl font-bold text-text">Projetos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReorderOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-text"
            aria-label="Ordenar projetos"
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white"
            aria-label="Novo projeto"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="flex gap-2 px-5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              filter === f.value ? 'bg-accent text-white' : 'bg-surface text-text-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={24} />}
            title="Nenhum projeto por aqui"
            description="Crie um novo projeto para começar a organizar seu trabalho."
          />
        ) : (
          filtered.map((p) => {
            const { pct, total } = progressFor(p.id)
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      <FolderKanban size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-text">{p.name}</p>
                      {p.dueDate && <p className="text-xs text-text-faint">Prazo: {formatDate(p.dueDate)}</p>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-text-muted">{total} tarefas</span>
                </div>
                <ProgressBar value={pct} color={p.color} />
              </button>
            )
          })
        )}
      </div>

      <ProjectFormSheet open={formOpen} onClose={() => setFormOpen(false)} onCreated={(id) => navigate(`/projects/${id}`)} />
      <ReorderProjectsSheet open={reorderOpen} onClose={() => setReorderOpen(false)} />
    </div>
  )
}
