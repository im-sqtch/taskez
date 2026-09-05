import { LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useDataStore } from '@/store/dataStore'

export function DashboardToolbarCard({ onEdit }: { onEdit: () => void }) {
  const visibleCount = useDataStore((s) => s.layout.widgets.filter((w) => w.visible).length)

  return (
    <Card elevated className="flex items-center gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <LayoutGrid size={20} />
      </div>
      <div className="flex-1">
        <p className="font-bold text-text">Painel Modular</p>
        <p className="text-xs text-text-faint">{visibleCount} widgets visíveis</p>
      </div>
      <button
        onClick={onEdit}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-white"
      >
        <SlidersHorizontal size={13} />
        Editar Layout
      </button>
    </Card>
  )
}
