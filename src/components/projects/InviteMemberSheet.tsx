import { UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/Sheet'
import { useDataStore, useWorkspaceTeam } from '@/store/dataStore'
import type { Project } from '@/types'

interface InviteMemberSheetProps {
  open: boolean
  onClose: () => void
  project: Project
}

export function InviteMemberSheet({ open, onClose, project }: InviteMemberSheetProps) {
  const team = useWorkspaceTeam()
  const updateProject = useDataStore((s) => s.updateProject)

  const available = team.filter((m) => !project.memberIds.includes(m.id))

  function invite(memberId: string) {
    updateProject(project.id, { memberIds: [...project.memberIds, memberId] })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Convidar membro" subtitle="Adicione alguém da sua equipe a este projeto">
      {available.length === 0 ? (
        <EmptyState icon={<UserPlus size={22} />} title="Todo mundo já foi convidado" description="Sua equipe inteira já faz parte deste projeto." />
      ) : (
        <div className="flex flex-col gap-2">
          {available.map((member) => (
            <button
              key={member.id}
              onClick={() => invite(member.id)}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 text-left transition-colors hover:bg-surface-hover"
            >
              <Avatar name={member.name} color={member.avatarColor} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{member.name}</p>
                <p className="text-xs text-text-faint">{member.role}</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                <UserPlus size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
