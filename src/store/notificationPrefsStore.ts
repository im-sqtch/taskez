import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  NOTIFICATION_EVENTS,
  eventsInCategory,
  type NotificationCategory,
  type NotificationEvent,
} from '@/lib/notificationCatalog'

// Só guardamos o que foi desligado: qualquer evento ausente do mapa conta como
// ligado. Assim um tipo novo adicionado ao catálogo já nasce ativo para quem
// tem preferências salvas de antes.
interface NotificationPrefsState {
  disabled: Partial<Record<NotificationEvent, true>>
  setEventEnabled: (event: NotificationEvent, enabled: boolean) => void
  toggleEvent: (event: NotificationEvent) => void
  setCategoryEnabled: (category: NotificationCategory, enabled: boolean) => void
  resetPrefs: () => void
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      disabled: {},
      setEventEnabled: (event, enabled) =>
        set((state) => {
          if (NOTIFICATION_EVENTS[event].alwaysOn) return state
          const disabled = { ...state.disabled }
          if (enabled) delete disabled[event]
          else disabled[event] = true
          return { disabled }
        }),
      toggleEvent: (event) =>
        set((state) => {
          if (NOTIFICATION_EVENTS[event].alwaysOn) return state
          const disabled = { ...state.disabled }
          if (disabled[event]) delete disabled[event]
          else disabled[event] = true
          return { disabled }
        }),
      setCategoryEnabled: (category, enabled) =>
        set((state) => {
          const disabled = { ...state.disabled }
          for (const event of eventsInCategory(category)) {
            if (NOTIFICATION_EVENTS[event].alwaysOn) continue
            if (enabled) delete disabled[event]
            else disabled[event] = true
          }
          return { disabled }
        }),
      resetPrefs: () => set({ disabled: {} }),
    }),
    { name: 'taskez-notification-prefs' },
  ),
)

// Consultado fora do React (dentro dos stores, na hora de criar a notificação).
export function isNotificationEventEnabled(event: NotificationEvent): boolean {
  if (NOTIFICATION_EVENTS[event].alwaysOn) return true
  return !useNotificationPrefsStore.getState().disabled[event]
}
