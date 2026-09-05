import { UserPlus, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/Sheet'
import { useAuthStore } from '@/store/authStore'
import { useAcceptedContacts } from '@/store/contactsStore'
import { useDataStore, useWorkspaceTeam } from '@/store/dataStore'

interface AddTeamMemberSheetProps {
  open: boolean
  onClose: () => void
}

export function AddTeamMemberSheet({ open, onClose }: AddTeamMemberSheetProps) {
  const currentUser = useAuthStore((s) => s.currentUser())
  const contacts = useAcceptedContacts(currentUser?.id)
  const team = useWorkspaceTeam()
  const addTeamMember = useDataStore((s) => s.addTeamMember)

  const linkedIds = new Set(team.map((m) => m.linkedUserId).filter(Boolean))
  const available = contacts.filter((c) => !linkedIds.has(c.user.id))

  function handleAdd(user: { id: string; name: string; avatarColor: string }) {
    addTeamMember({ name: user.name, role: 'Membro da equipe', avatarColor: user.avatarColor, linkedUserId: user.id })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Adicionar membro da equipe" subtitle="Escolha alguém da sua lista de contatos">
      {contacts.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Você ainda não tem contatos"
          description="Adicione contatos em 'Meus contatos' antes de trazê-los para a equipe deste workspace."
        />
      ) : available.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="Todos os seus contatos já estão nesta equipe" />
      ) : (
        <div className="flex flex-col gap-2">
          {available.map(({ contact, user }) => (
            <button
              key={contact.id}
              onClick={() => handleAdd(user)}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 text-left transition-colors hover:bg-surface-hover"
            >
              <Avatar name={user.name} color={user.avatarColor} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{user.name}</p>
                <p className="truncate text-xs text-text-faint">{user.email}</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <UserPlus size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
