import { CheckCircle2, Flame, ListChecks, Target, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { computeStats, weeklyHistory } from '@/lib/stats'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-white/10 px-2 py-3 text-center">
      {icon}
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] leading-tight text-white/70">{label}</p>
    </div>
  )
}

export function SummaryWidget({ size }: { size: WidgetSize }) {
  const tasks = useWorkspaceTasks()
  const stats = computeStats(tasks)
  const history = weeklyHistory(tasks)
  const maxCount = Math.max(1, ...history.map((d) => d.count))

  return (
    <Card
      elevated
      className="relative overflow-hidden bg-gradient-to-br from-accent to-[#5A3FD6] border-none text-white"
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">Progresso da semana</p>
          <div className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
            <Flame size={13} />
            {stats.streak}d
          </div>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-4xl font-extrabold">{stats.weekProgress}%</p>
          {size !== 'S' && (
            <p className="pb-1 text-xs font-medium text-white/70">das tarefas da semana concluídas</p>
          )}
        </div>

        {size !== 'S' && <ProgressBar value={stats.weekProgress} color="white" trackClassName="bg-white/20" />}

        {size === 'M' && (
          <div className="flex gap-3 pt-1">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
              <ListChecks size={16} />
              <div>
                <p className="text-sm font-bold leading-tight">{stats.dueToday}</p>
                <p className="text-[11px] text-white/70">para hoje</p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
              <TriangleAlert size={16} />
              <div>
                <p className="text-sm font-bold leading-tight">{stats.overdue}</p>
                <p className="text-[11px] text-white/70">atrasadas</p>
              </div>
            </div>
          </div>
        )}

        {size === 'L' && (
          <>
            <div className="flex gap-3 pt-1">
              <StatPill icon={<CheckCircle2 size={16} />} value={`${stats.completedToday}`} label={`de ${stats.totalTasks} totais`} />
              <StatPill icon={<Target size={16} />} value={stats.inProgress} label="em andamento" />
              <StatPill icon={<Flame size={16} />} value={`${stats.streak}d`} label="consecutivos" />
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl bg-white/10 px-3.5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white/80">Eficiência Semanal</p>
                <p className="text-sm font-bold">{stats.weekProgress}%</p>
              </div>
              <ProgressBar value={stats.weekProgress} color="white" trackClassName="bg-white/20" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-white/80">Histórico de Conclusão</p>
              <div className="flex items-end justify-between gap-1.5 px-1">
                {history.map((day, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-12 w-full items-end">
                      <div
                        className={cn('w-full rounded-md bg-white/25', day.isToday && 'bg-white')}
                        style={{ height: `${Math.max(10, (day.count / maxCount) * 100)}%` }}
                      />
                    </div>
                    <span className={cn('text-[11px] font-medium text-white/60', day.isToday && 'text-white font-bold')}>
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
