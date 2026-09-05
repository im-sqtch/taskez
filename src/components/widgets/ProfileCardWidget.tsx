import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { computeStats } from '@/lib/stats'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <p className="text-sm font-bold text-text">{value}</p>
      <p className="text-[11px] text-text-faint">{label}</p>
    </div>
  )
}

export function ProfileCardWidget({ size }: { size: WidgetSize }) {
  const user = useAuthStore((s) => s.currentUser())
  const tasks = useWorkspaceTasks()
  const navigate = useNavigate()

  if (!user) return null
  const stats = computeStats(tasks)

  return (
    <Card className="transition-colors hover:bg-surface-hover" onClick={() => navigate('/profile')}>
      <div className="flex items-center gap-3.5">
        <Avatar name={user.name} color={user.avatarColor} size="sm" />
        <div className="flex-1">
          <p className="font-semibold text-text">{user.name}</p>
        </div>
        <ChevronRight size={18} className="text-text-faint" />
      </div>

      {size === 'M' && (
        <div className="mt-3.5 flex items-center justify-between border-t border-border-soft pt-3.5">
          <StatCell value={`${stats.streak}d`} label="dias seguidos" />
          <StatCell value={stats.completedTotal} label="concluídas" />
          <StatCell value={`${stats.weekProgress}%`} label="da semana" />
        </div>
      )}
    </Card>
  )
}
