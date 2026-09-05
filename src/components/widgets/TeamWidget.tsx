import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useWorkspaceTeam } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

const statusColor = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-text-faint',
}

export function TeamWidget({ size }: { size: WidgetSize }) {
  const team = useWorkspaceTeam()
  const navigate = useNavigate()

  if (team.length === 0) return null

  if (size === 'S') {
    return (
      <Card className="flex items-center justify-between" onClick={() => navigate('/profile')}>
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {team.slice(0, 3).map((m) => (
              <Avatar key={m.id} name={m.name} color={m.avatarColor} size="xs" ring />
            ))}
          </div>
          <p className="font-semibold text-text">Minha equipe</p>
        </div>
        <p className="text-lg font-bold text-text">{team.length}</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text">Minha equipe</h3>
        <button onClick={() => navigate('/profile')} className="text-sm font-semibold text-accent">
          Ver tudo
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {team.slice(0, 4).map((member) => (
          <div key={member.id} className="flex items-center gap-3">
            <div className="relative">
              <Avatar name={member.name} color={member.avatarColor} size="sm" />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
                  statusColor[member.status],
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-text">{member.name}</p>
              <p className="truncate text-xs text-text-faint">{member.role}</p>
            </div>
            <span className="text-xs font-semibold text-text-muted">{member.workload}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
