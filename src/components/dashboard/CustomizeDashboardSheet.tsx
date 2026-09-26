import { GripVertical, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Switch } from '@/components/ui/Switch'
import { SortableItem, SortableList } from '@/components/ui/SortableList'
import { cn } from '@/lib/utils'
import { reorderItems } from '@/lib/reorder'
import { nextSize, SIZE_LABELS, WIDGET_CATALOG } from '@/lib/widgetCatalog'
import { defaultLayout, useDataStore, useWorkspaceLayout } from '@/store/dataStore'
import type { DashboardWidget } from '@/types'

interface CustomizeDashboardSheetProps {
  open: boolean
  onClose: () => void
}

export function CustomizeDashboardSheet({ open, onClose }: CustomizeDashboardSheetProps) {
  const layout = useWorkspaceLayout()
  const setLayout = useDataStore((s) => s.setLayout)
  const [draft, setDraft] = useState<DashboardWidget[]>([])

  useEffect(() => {
    if (open) setDraft([...layout.widgets].sort((a, b) => a.order - b.order))
  }, [open, layout])

  function reorder(oldIndex: number, newIndex: number) {
    setDraft((prev) => reorderItems(prev, oldIndex, newIndex).map((widget, order) => ({ ...widget, order })))
  }

  function cycleSize(id: string) {
    setDraft((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        const allowed = WIDGET_CATALOG[w.type].allowedSizes
        return { ...w, size: nextSize(w.size, allowed) }
      }),
    )
  }

  function toggleVisible(id: string) {
    setDraft((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  }

  function handleRestoreDefault() {
    setDraft([...defaultLayout().widgets].sort((a, b) => a.order - b.order))
  }

  function handleSave() {
    setLayout({ widgets: draft })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Personalizar Painel"
      subtitle="Arraste para reordenar, ative e ajuste o tamanho dos widgets"
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={handleRestoreDefault}
            className="shrink-0 whitespace-nowrap"
          >
            Restaurar
          </Button>
          <Button size="sm" fullWidth onClick={handleSave} className="whitespace-nowrap">
            Salvar Alterações
          </Button>
        </div>
      }
    >
      <SortableList ids={draft.map((widget) => widget.id)} onReorder={reorder} className="flex flex-col gap-2">
        {draft.map((widget) => {
          const catalog = WIDGET_CATALOG[widget.type]
          const Icon = catalog.icon
          return (
            <SortableItem
              key={widget.id}
              id={widget.id}
              className={cn(
                'flex items-center gap-3 rounded-xl bg-surface p-3 transition-[background-color,opacity] duration-300',
                !widget.visible && 'opacity-50',
              )}
            >
              <GripVertical size={18} className="shrink-0 text-text-faint" aria-hidden="true" />

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                <Icon size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{catalog.label}</p>
                {catalog.allowedSizes.length > 1 ? (
                  <button
                    onClick={() => cycleSize(widget.id)}
                    className="mt-0.5 flex items-center gap-1 text-xs font-medium text-accent"
                  >
                    Tamanho: {SIZE_LABELS[widget.size]}
                    <span className="text-[10px]">↕</span>
                  </button>
                ) : (
                  <p className="mt-0.5 text-xs font-medium text-accent">Tamanho: {SIZE_LABELS[widget.size]}</p>
                )}
              </div>

              <Switch checked={widget.visible} onChange={() => toggleVisible(widget.id)} aria-label={`Exibir ${catalog.label}`} />
            </SortableItem>
          )
        })}
      </SortableList>
    </Sheet>
  )
}
