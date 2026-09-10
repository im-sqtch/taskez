import { ChevronRight, Crown, Flame, Layers, ListChecks, Settings, Trash2, TrendingUp, UserPlus, Users } from 'lucide-react'
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
import { confirmAction } from '@/store/confirmStore'
import { useAuthStore } from '@/store/authStore'
import { useAcceptedContacts, useContactsStore } from '@/store/contactsStore'
import { useCurrentWorkspace, useDataStore, useWorkspaceTasks, useWorkspaceTeam } from '@/store/dataStore'

const usageModeLabels = { personal: 'Uso pessoal', team: 'Equipe', client: 'Clientes' }

export function ProfilePage() {
  const user = useAuthStore((s) => s.currentUser())
  const tasks = useWorkspaceTasks()
  const team = useWorkspaceTeam()
  const allTeamMembers = useDataStore((s) => s.team)
  const workspaces = useDataStore((s) => s.workspaces)
  const workspaceRoles = useDataStore((s) => s.workspaceRoles)
  const removeTeamMember = useDataStore((s) => s.removeTeamMember)
  const transferOwnership = useDataStore((s) => s.transferOwnership)
  const removeContact = useContactsStore((s) => s.removeContact)
  const contacts = useAcceptedContacts(user?.id)
  const currentWorkspace = useCurrentWorkspace()
  const navigate = useNavigate()
  const [workspaceSheetOpen, setWorkspaceSheetOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)

  if (!user) return null
  const stats = computeStats(tasks)
  const isOwnerHere = currentWorkspace ? workspaceRoles[currentWorkspace.id] === 'owner' : false

  function handleRemoveMember(memberId: string, memberName: string) {
    confirmAction({
      title: 'Remover da equipe',
      description: `Remover ${memberName} da equipe deste workspace? O acesso dela ao workspace é revogado.`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => removeTeamMember(memberId),
    })
  }

  function handleTransferOwnership(workspaceId: string, newOwnerId: string, memberName: string) {
    confirmAction({
      title: 'Transferir titularidade',
      description: `Transferir a titularidade desta workspace para ${memberName}? Você deixa de ser dono(a) — ela passa a poder remover membros, apagar projetos/arquivos e a própria workspace.`,
      confirmLabel: 'Transferir',
      danger: true,
      confirmText: memberName,
      onConfirm: async () => {
        const result = await transferOwnership(workspaceId, newOwnerId)
        if (!result.ok) {
          confirmAction({ title: 'Não foi possível transferir', description: result.error, hideCancel: true, onConfirm: () => {} })
        }
      },
    })
  }

  function handleRemoveContact(contactId: string, contactUserId: string, contactName: string) {
    const blockingWorkspaceIds = [...new Set(allTeamMembers.filter((m) => m.linkedUserId === contactUserId).map((m) => m.workspaceId))]
    if (blockingWorkspaceIds.length > 0) {
      const names = blockingWorkspaceIds.map((id) => workspaces.find((w) => w.id === id)?.name ?? 'workspace').join(', ')
      const canRemoveMyself = blockingWorkspaceIds.some((id) => workspaceRoles[id] === 'owner')
      confirmAction({
        title: 'Não é possível remover ainda',
        description: canRemoveMyself
          ? `${contactName} ainda faz parte da equipe de: ${names}. Remova-a de lá primeiro.`
          : `${contactName} ainda faz parte da equipe de: ${names}. Só o dono dessa workspace pode removê-la de lá — peça a ele antes de excluir esse contato.`,
        hideCancel: true,
        onConfirm: () => {},
      })
      return
    }
    confirmAction({
      title: 'Remover contato',
      description: `Remover ${contactName} da sua lista de contatos?`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => removeContact(contactId),
    })
  }

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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{m.name}</p>
                <p className="truncate text-xs text-text-faint">{m.role}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold capitalize text-text-muted">
                {m.status === 'online' ? 'Online' : m.status === 'away' ? 'Ausente' : 'Offline'}
              </span>
              {isOwnerHere && !m.isSelf && currentWorkspace && m.linkedUserId && (
                <button
                  onClick={() => handleTransferOwnership(currentWorkspace.id, m.linkedUserId!, m.name)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-accent"
                  aria-label={`Tornar ${m.name} dono(a) da workspace`}
                >
                  <Crown size={15} />
                </button>
              )}
              {isOwnerHere && !m.isSelf && (
                <button
                  onClick={() => handleRemoveMember(m.id, m.name)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-danger"
                  aria-label={`Remover ${m.name} da equipe`}
                >
                  <Trash2 size={15} />
                </button>
              )}
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{contactUser.name}</p>
                  <p className="truncate text-xs text-text-faint">{contactUser.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveContact(contact.id, contactUser.id, contactUser.name)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-danger"
                  aria-label={`Remover ${contactUser.name} dos contatos`}
                >
                  <Trash2 size={15} />
                </button>
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
