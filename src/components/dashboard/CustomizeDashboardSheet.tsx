import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import { nextSize, SIZE_LABELS, WIDGET_CATALOG } from '@/lib/widgetCatalog'
import { defaultLayout, useDataStore } from '@/store/dataStore'
import type { DashboardWidget } from '@/types'

interface CustomizeDashboardSheetProps {
  open: boolean
  onClose: () => void
}

export function CustomizeDashboardSheet({ open, onClose }: CustomizeDashboardSheetProps) {
  const layout = useDataStore((s) => s.layout)
  const setLayout = useDataStore((s) => s.setLayout)
  const [draft, setDraft] = useState<DashboardWidget[]>([])

  useEffect(() => {
    if (open) setDraft([...layout.widgets].sort((a, b) => a.order - b.order))
  }, [open, layout])

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= draft.length) return
    setDraft((prev) => {
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!]
      return next.map((w, i) => ({ ...w, order: i }))
    })
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
      subtitle="Ative, reordene e ajuste o tamanho dos widgets"
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
      <div className="flex flex-col gap-2">
        {draft.map((widget, index) => {
          const catalog = WIDGET_CATALOG[widget.type]
          const Icon = catalog.icon
          return (
            <div
              key={widget.id}
              className={cn(
                'flex items-center gap-3 rounded-xl bg-surface p-3 transition-opacity',
                !widget.visible && 'opacity-50',
              )}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="flex h-6 w-6 items-center justify-center text-text-faint disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  className="flex h-6 w-6 items-center justify-center text-text-faint disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

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
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
