import { create } from 'zustand'

interface UiState {
  quickCreateOpen: boolean
  searchOpen: boolean
  notificationsOpen: boolean
  // Painel de notificações "encaixado" ao lado da sidebar no desktop — estado
  // separado do `notificationsOpen` (usado pelo modal mobile) porque as regras
  // de fechamento são diferentes: este só fecha ao clicar em outro item da
  // sidebar, nunca ao navegar para a notificação clicada.
  desktopNotificationsOpen: boolean
  openQuickCreate: () => void
  closeQuickCreate: () => void
  openSearch: () => void
  closeSearch: () => void
  openNotifications: () => void
  closeNotifications: () => void
  toggleDesktopNotifications: () => void
  closeDesktopNotifications: () => void
}

export const useUiStore = create<UiState>((set) => ({
  quickCreateOpen: false,
  searchOpen: false,
  notificationsOpen: false,
  desktopNotificationsOpen: false,
  openQuickCreate: () => set({ quickCreateOpen: true }),
  closeQuickCreate: () => set({ quickCreateOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openNotifications: () => set({ notificationsOpen: true }),
  closeNotifications: () => set({ notificationsOpen: false }),
  toggleDesktopNotifications: () => set((s) => ({ desktopNotificationsOpen: !s.desktopNotificationsOpen })),
  closeDesktopNotifications: () => set({ desktopNotificationsOpen: false }),
}))
