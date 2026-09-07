import { Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Switch } from '@/components/ui/Switch'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_EVENTS,
  eventsInCategory,
} from '@/lib/notificationCatalog'
import { useNotificationPrefsStore } from '@/store/notificationPrefsStore'

interface NotificationPrefsSheetProps {
  open: boolean
  onClose: () => void
}

export function NotificationPrefsSheet({ open, onClose }: NotificationPrefsSheetProps) {
  const disabled = useNotificationPrefsStore((s) => s.disabled)
  const toggleEvent = useNotificationPrefsStore((s) => s.toggleEvent)
  const setCategoryEnabled = useNotificationPrefsStore((s) => s.setCategoryEnabled)
  const resetPrefs = useNotificationPrefsStore((s) => s.resetPrefs)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tipos de notificação"
      subtitle="Escolha o que o TASKEZ deve avisar, na lista e no push"
      footer={
        <Button variant="secondary" size="sm" fullWidth icon={<RotateCcw size={14} />} onClick={resetPrefs}>
          Ativar todas
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {NOTIFICATION_CATEGORIES.map((category) => {
          const events = eventsInCategory(category)
          const toggleable = events.filter((event) => !NOTIFICATION_EVENTS[event].alwaysOn)
          const allOn = toggleable.length > 0 && toggleable.every((event) => !disabled[event])

          return (
            <div key={category} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-wide text-text-faint">
                  {NOTIFICATION_CATEGORY_LABELS[category]}
                </p>
                {toggleable.length > 1 && (
                  <button
                    onClick={() => setCategoryEnabled(category, !allOn)}
                    className="text-xs font-semibold text-accent"
                  >
                    {allOn ? 'Desativar todas' : 'Ativar todas'}
                  </button>
                )}
              </div>

              <div className="flex flex-col overflow-hidden rounded-xl bg-surface">
                {events.map((event) => {
                  const info = NOTIFICATION_EVENTS[event]
                  return (
                    <div key={event} className="flex items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text">{info.label}</p>
                        <p className="text-xs text-text-faint">{info.description}</p>
                      </div>
                      {info.alwaysOn ? (
                        <Lock size={15} className="shrink-0 text-text-faint" />
                      ) : (
                        <Switch checked={!disabled[event]} onChange={() => toggleEvent(event)} aria-label={info.label} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
