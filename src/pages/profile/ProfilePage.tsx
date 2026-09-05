import { ChevronRight, Flame, Layers, ListChecks, Settings, TrendingUp, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddContactSheet } from '@/components/profile/AddContactSheet'
import { AddTeamMemberSheet } from '@/components/profile/AddTeamMemberSheet'
import { WorkspaceSwitcherSheet } from '@/components/workspace/WorkspaceSwitcherSheet'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { computeStats } from '@/lib/stats'
import { useAuthStore } from '@/store/authStore'
import { useAcceptedContacts } from '@/store/contactsStore'
import { useCurrentWorkspace, useWorkspaceTasks, useWorkspaceTeam } from '@/store/dataStore'

const usageModeLabels = { personal: 'Uso pessoal', team: 'Equipe', client: 'Clientes' }

export function ProfilePage() {
  const user = useAuthStore((s) => s.currentUser())
  const tasks = useWorkspaceTasks()
  const team = useWorkspaceTeam()
  const contacts = useAcceptedContacts(user?.id)
  const currentWorkspace = useCurrentWorkspace()
  const navigate = useNavigate()
  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)

  if (!user) return null
  const stats = computeStats(tasks)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-2xl font-bold text-text">Perfil</h1>
        <button onClick={() => navigate('/settings')} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <Settings size={18} />
        </button>
      </header>

      <div className="flex flex-col items-center gap-3 px-5 text-center">
        <Avatar name={user.name} color={user.avatarColor} size="lg" />
        <div>
          <p className="text-lg font-bold text-text">{user.name}</p>
          <p className="text-sm text-text-faint">{user.email}</p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          {usageModeLabels[user.usageMode]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 px-5">
        <Card className="flex flex-col items-center gap-1 py-4">
          <Flame size={18} className="text-warning" />
          <p className="text-lg font-bold text-text">{stats.streak}</p>
          <p className="text-center text-[11px] text-text-faint">dias seguidos</p>
        </Card>
        <Card className="flex flex-col items-center gap-1 py-4">
          <ListChecks size={18} className="text-success" />
          <p className="text-lg font-bold text-text">{stats.completedTotal}</p>
          <p className="text-center text-[11px] text-text-faint">concluídas</p>
        </Card>
        <Card className="flex flex-col items-center gap-1 py-4">
          <TrendingUp size={18} className="text-accent" />
          <p className="text-lg font-bold text-text">{stats.weekProgress}%</p>
          <p className="text-center text-[11px] text-text-faint">na semana</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center gap-2 px-1">
          <Users size={15} className="text-text-faint" />
          <p className="text-sm font-bold text-text">Equipe da Workspace</p>
        </div>
        <Card className="flex flex-col gap-3">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} color={m.avatarColor} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{m.name}</p>
                <p className="text-xs text-text-faint">{m.role}</p>
              </div>
              <span className="text-xs font-semibold capitalize text-text-muted">
                {m.status === 'online' ? 'Online' : m.status === 'away' ? 'Ausente' : 'Offline'}
              </span>
            </div>
          ))}
        </Card>
        <Button variant="secondary" size="sm" icon={<UserPlus size={15} />} onClick={() => setAddMemberOpen(true)} className="self-start">
          Adicionar membro da equipe
        </Button>
      </div>

      <div className="flex flex-col gap-3 px-5">
        <div className="flex items-center gap-2 px-1">
          <UserPlus size={15} className="text-text-faint" />
          <p className="text-sm font-bold text-text">Meus contatos</p>
        </div>
        <Card className="flex flex-col gap-3">
          {contacts.length === 0 ? (
            <EmptyState icon={<UserPlus size={20} />} title="Nenhum contato ainda" description="Adicione pessoas pelo e-mail para trazê-las às suas equipes." />
          ) : (
            contacts.map(({ contact, user: contactUser }) => (
              <div key={contact.id} className="flex items-center gap-3">
                <Avatar name={contactUser.name} color={contactUser.avatarColor} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">{contactUser.name}</p>
                  <p className="text-xs text-text-faint">{contactUser.email}</p>
                </div>
              </div>
            ))
          )}
        </Card>
        <Button variant="secondary" size="sm" icon={<UserPlus size={15} />} onClick={() => setAddContactOpen(true)} className="self-start">
          Adicionar contato
        </Button>
      </div>

      <button
        onClick={() => setWorkspaceSheetOpen(true)}
        className="mx-5 flex items-center justify-between rounded-xl bg-surface p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: currentWorkspace?.color }}
          >
            <Layers size={16} />
          </div>
          <div>
            <span className="block font-semibold text-text">Workspaces</span>
            <span className="block text-xs text-text-faint">{currentWorkspace?.name}</span>
          </div>
        </div>
        <ChevronRight size={18} className="text-text-faint" />
      </button>

      <button
        onClick={() => navigate('/settings')}
        className="mx-5 flex items-center justify-between rounded-xl bg-surface p-4 text-left"
      >
        <span className="font-semibold text-text">Configurações</span>
        <ChevronRight size={18} className="text-text-faint" />
      </button>

      <WorkspaceSwitcherSheet open={workspaceSheetOpen} onClose={() => setWorkspaceSheetOpen(false)} />
      <AddTeamMemberSheet open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
      <AddContactSheet open={addContactOpen} onClose={() => setAddContactOpen(false)} />
    </div>
  )
}
