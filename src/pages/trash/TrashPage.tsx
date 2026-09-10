import { ArrowLeft, FolderKanban, ListTodo, Paperclip, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBytes, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { Project, ProjectFile, Task } from '@/types'

// Mesmo prazo de retenção usado pelo auto-purge no banco (ver Edge Function
// purge-trash) — só pra mostrar "expira em N dias" na UI; quem decide de
// verdade quando um item some de vez é o cron, não esta constante.
const RETENTION_DAYS = 30

function daysLeft(deletedAt?: string): number {
  if (!deletedAt) return RETENTION_DAYS
  const elapsedMs = Date.now() - new Date(deletedAt).getTime()
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000))
  return Math.max(0, RETENTION_DAYS - elapsedDays)
}

export function TrashPage() {
  const navigate = useNavigate()
  const trash = useDataStore((s) => s.trash)
  const trashLoading = useDataStore((s) => s.trashLoading)
  const fetchTrash = useDataStore((s) => s.fetchTrash)
  const restoreProject = useDataStore((s) => s.restoreProject)
  const restoreTask = useDataStore((s) => s.restoreTask)
  const restoreFile = useDataStore((s) => s.restoreFile)
  const currentWorkspaceId = useDataStore((s) => s.currentWorkspaceId)
  const isWorkspaceOwner = useDataStore((s) => s.workspaceRoles[s.currentWorkspaceId] === 'owner')
  const currentUser = useAuthStore((s) => s.currentUser())
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchTrash()
  }, [currentWorkspaceId, fetchTrash])

  const canRestore = (deletedBy?: string) => isWorkspaceOwner || deletedBy === currentUser?.id

  async function handleRestore(kind: 'project' | 'task' | 'file', id: string) {
    setError(null)
    setRestoringId(id)
    const result =
      kind === 'project' ? await restoreProject(id) : kind === 'task' ? await restoreTask(id) : await restoreFile(id)
    setRestoringId(null)
    if (!result.ok) setError(result.error)
  }

  const isEmpty = trash.projects.length === 0 && trash.tasks.length === 0 && trash.files.length === 0

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text">Lixeira</h1>
          <p className="text-xs text-text-faint">Itens ficam disponíveis por {RETENTION_DAYS} dias antes de serem apagados para sempre.</p>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5">
        {error && <p className="text-xs font-medium text-danger">{error}</p>}

        {trashLoading ? (
          <p className="text-sm text-text-faint">Carregando...</p>
        ) : isEmpty ? (
          <EmptyState icon={<Trash2 size={22} />} title="Lixeira vazia" description="Projetos, tarefas e arquivos excluídos aparecem aqui." />
        ) : (
          <>
            {trash.projects.length > 0 && (
              <Section title="Projetos" icon={<FolderKanban size={15} />}>
                {trash.projects.map((project: Project) => (
                  <TrashRow
                    key={project.id}
                    title={project.name}
                    subtitle={`Excluído em ${formatDate(project.deletedAt)} · expira em ${daysLeft(project.deletedAt)} dias`}
                    canRestore={canRestore(project.deletedBy)}
                    restoring={restoringId === project.id}
                    onRestore={() => handleRestore('project', project.id)}
                  />
                ))}
              </Section>
            )}

            {trash.tasks.length > 0 && (
              <Section title="Tarefas" icon={<ListTodo size={15} />}>
                {trash.tasks.map((task: Task) => {
                  // Uma tarefa cujo projeto também está na lixeira só volta
                  // junto com ele (ver restore_task no banco) — evita o botão
                  // falhar tentando restaurar algo que reapareceria "dentro"
                  // de um projeto ainda invisível.
                  const projectAlsoInTrash = task.projectId ? trash.projects.some((p) => p.id === task.projectId) : false
                  return (
                    <TrashRow
                      key={task.id}
                      title={task.title}
                      subtitle={
                        projectAlsoInTrash
                          ? 'Restaure o projeto para recuperar esta tarefa'
                          : `Excluída em ${formatDate(task.deletedAt)} · expira em ${daysLeft(task.deletedAt)} dias`
                      }
                      canRestore={!projectAlsoInTrash && canRestore(task.deletedBy)}
                      restoring={restoringId === task.id}
                      onRestore={() => handleRestore('task', task.id)}
                    />
                  )
                })}
              </Section>
            )}

            {trash.files.length > 0 && (
              <Section title="Arquivos" icon={<Paperclip size={15} />}>
                {trash.files.map((file: ProjectFile) => (
                  <TrashRow
                    key={file.id}
                    title={file.name}
                    subtitle={`${formatBytes(file.size)} · expira em ${daysLeft(file.deletedAt)} dias`}
                    canRestore={canRestore(file.deletedBy)}
                    restoring={restoringId === file.id}
                    onRestore={() => handleRestore('file', file.id)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-faint">
        {icon}
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function TrashRow({
  title,
  subtitle,
  canRestore,
  restoring,
  onRestore,
}: {
  title: string
  subtitle: string
  canRestore: boolean
  restoring: boolean
  onRestore: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{title}</p>
        <p className="text-xs text-text-faint">{subtitle}</p>
      </div>
      {canRestore && (
        <button
          onClick={onRestore}
          disabled={restoring}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-accent disabled:opacity-40"
          aria-label={`Restaurar ${title}`}
        >
          <RotateCcw size={16} />
        </button>
      )}
    </div>
  )
}
