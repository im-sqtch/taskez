import { useEffect, useState } from 'react'
import { CustomizeDashboardSheet } from '@/components/dashboard/CustomizeDashboardSheet'
import { DashboardToolbarCard } from '@/components/dashboard/DashboardToolbarCard'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { ProfileCardWidget } from '@/components/widgets/ProfileCardWidget'
import { ProjectsWidget } from '@/components/widgets/ProjectsWidget'
import { ShortcutsWidget } from '@/components/widgets/ShortcutsWidget'
import { SummaryWidget } from '@/components/widgets/SummaryWidget'
import { TasksWidget } from '@/components/widgets/TasksWidget'
import { TeamWidget } from '@/components/widgets/TeamWidget'
import { UtilityWidget } from '@/components/widgets/UtilityWidget'
import { useDataStore } from '@/store/dataStore'
import type { WidgetSize, WidgetType } from '@/types'

const widgetComponents: Record<WidgetType, React.ComponentType<{ size: WidgetSize }>> = {
  summary: SummaryWidget,
  tasks: TasksWidget,
  projects: ProjectsWidget,
  team: TeamWidget,
  profile: ProfileCardWidget,
  shortcuts: ShortcutsWidget,
  utility: UtilityWidget,
}

export function DashboardPage() {
  const layout = useDataStore((s) => s.layout)
  const seedIfEmpty = useDataStore((s) => s.seedIfEmpty)
  const migrateProfileSizeIfNeeded = useDataStore((s) => s.migrateProfileSizeIfNeeded)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  useEffect(() => {
    seedIfEmpty()
    migrateProfileSizeIfNeeded()
  }, [seedIfEmpty, migrateProfileSizeIfNeeded])

  const visibleWidgets = [...layout.widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader />
      <div className="flex flex-col gap-4 px-5">
        <DashboardToolbarCard onEdit={() => setCustomizeOpen(true)} />
        {visibleWidgets.map((w) => {
          const Widget = widgetComponents[w.type]
          return <Widget key={w.id} size={w.size} />
        })}
      </div>
      <CustomizeDashboardSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  )
}
