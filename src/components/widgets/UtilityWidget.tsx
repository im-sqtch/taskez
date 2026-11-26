import { Flame, Timer } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Sheet } from '@/components/ui/Sheet'
import { FocusTimers } from './FocusTimers'
import { computeStats } from '@/lib/stats'
import { widgetContentSize } from '@/lib/widgetCatalog'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

function StreakRow({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface-alt px-3.5 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
        <Flame size={15} />
      </div>
      <p className="flex-1 text-sm font-medium text-text">Sequência de dias</p>
      <p className="text-sm font-bold text-text">{streak}d</p>
    </div>
  )
}

export function UtilityWidget({ size }: { size: WidgetSize }) {
  const content = widgetContentSize(size)
  const tasks = useWorkspaceTasks()
  const stats = computeStats(tasks)
  const [timersOpen, setTimersOpen] = useState(false)

  if (content === 'S') {
    return (
      <Card className="flex flex-col gap-3.5">
        <StreakRow streak={stats.streak} />
        <button type="button" onClick={() => setTimersOpen(true)} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-accent"><Timer size={17} aria-hidden="true" />Meus timers</button>
        <Sheet open={timersOpen} onClose={() => setTimersOpen(false)} title="Timers e foco"><FocusTimers /></Sheet>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3.5">
      {content === 'L' && <StreakRow streak={stats.streak} />}
      <FocusTimers />
    </Card>
  )
}
