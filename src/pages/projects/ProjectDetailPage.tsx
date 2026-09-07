import { Archive, ArchiveRestore, ArrowLeft, Calendar, Pencil, Plus, Trash2, UserPlus, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InviteMemberSheet } from '@/components/projects/InviteMemberSheet'
import { ProjectChat } from '@/components/projects/ProjectChat'
import { ProjectFiles } from '@/components/projects/ProjectFiles'
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { TaskRow } from '@/components/tasks/TaskRow'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn, formatDate } from '@/lib/utils'
import { useDataStore, useWorkspaceTasks, useWorkspaceTeam } from '@/store/dataStore'

const tabs = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'tasks', label: 'Tarefas' },
  { key: 'team', label: 'Equipe' },
  { key: 'files', label: 'Arquivos' },
  { key: 'chat', label: 'Chat' },
] as const

type TabKey = (typeof tabs)[number]['key']

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const project = useDataStore((s) => s.projects.find((p) => p.id === id))
  const allTasks = useWorkspaceTasks()
  const tasks = allTasks.filter((t) => t.projectId === id)
  const team = useWorkspaceTeam()
  const deleteProject = useDataStore((s) => s.deleteProject)
  const updateProject = useDataStore((s) => s.updateProject)

  const [tab, setTab] = useState<TabKey>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (!project) {
    return (
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <EmptyState icon={<Calendar size={22} />} title="Projeto não encontrado" />
      </div>
    )
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)
  const members = team.filter((m) => project.memberIds.includes(m.id))

  function handleDelete() {
    if (!project) return
    if (confirm(`Excluir o projeto "${project.name}"? As tarefas serão desvinculadas.`)) {
      deleteProject(project.id)
      navigate('/projects')
    }
  }

  function handleToggleArchive() {
    if (!project) return
    updateProject(project.id, { status: project.status === 'archived' ? 'active' : 'archived' })
  }

  function handleRemoveMember(memberId: string) {
    if (!project) return
    updateProject(project.id, { memberIds: project.memberIds.filter((id) => id !== memberId) })
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <ArrowLeft size={19} />
        </button>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
            <Pencil size={16} />
          </button>
          <button
            onClick={handleToggleArchive}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted"
            aria-label={project.status === 'archived' ? 'Desarquivar projeto' : 'Arquivar projeto'}
          >
            {project.status === 'archived' ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>
          <button onClick={handleDelete} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: project.color }}>
            <Calendar size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">{project.name}</h1>
            {project.dueDate && <p className="text-sm text-text-faint">Prazo: {formatDate(project.dueDate)}</p>}
          </div>
        </div>
        {project.description && <p className="text-sm text-text-muted">{project.description}</p>}
        <div className="flex flex-col gap-1.5">
          <ProgressBar value={pct} color={project.color} />
          <p className="text-xs font-medium text-text-muted">{pct}% concluído · {done}/{tasks.length} tarefas</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border-soft px-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-faint',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5">
        {tab === 'overview' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-surface p-4">
              <p className="mb-2 text-sm font-semibold text-text">Membros</p>
              <div className="flex -space-x-2">
                {members.map((m) => (
                  <Avatar key={m.id} name={m.name} color={m.avatarColor} size="sm" ring />
                ))}
                {members.length === 0 && <p className="text-sm text-text-faint">Nenhum membro ainda.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface p-4">
                <p className="text-2xl font-bold text-text">{tasks.length}</p>
                <p className="text-xs text-text-faint">Tarefas totais</p>
              </div>
              <div className="rounded-xl bg-surface p-4">
                <p className="text-2xl font-bold text-text">{done}</p>
                <p className="text-xs text-text-faint">Concluídas</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="flex flex-col gap-3">
            <Button variant="secondary" size="sm" icon={<Plus size={15} />} onClick={() => setTaskFormOpen(true)} className="self-start">
              Nova tarefa
            </Button>
            {tasks.length === 0 ? (
              <EmptyState icon={<Calendar size={22} />} title="Nenhuma tarefa neste projeto" />
            ) : (
              <div className="flex flex-col gap-1">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'team' && (
          <div className="flex flex-col gap-3">
            <Button variant="secondary" size="sm" icon={<UserPlus size={15} />} onClick={() => setInviteOpen(true)} className="self-start">
              Convidar membro
            </Button>
            {members.length === 0 ? (
              <EmptyState icon={<Users size={22} />} title="Nenhum membro neste projeto" />
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <Avatar name={m.name} color={m.avatarColor} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{m.name}</p>
                      <p className="text-xs text-text-faint">{m.role}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:text-danger"
                      aria-label={`Remover ${m.name}`}
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'files' && <ProjectFiles projectId={project.id} />}

        {tab === 'chat' && <ProjectChat projectId={project.id} />}
      </div>

      <ProjectFormSheet open={editOpen} onClose={() => setEditOpen(false)} project={project} />
      <TaskFormSheet open={taskFormOpen} onClose={() => setTaskFormOpen(false)} defaultProjectId={project.id} />
      <InviteMemberSheet open={inviteOpen} onClose={() => setInviteOpen(false)} project={project} />
    </div>
  )
}
