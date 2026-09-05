import { create } from 'zustand'

interface UiState {
  quickCreateOpen: boolean
  searchOpen: boolean
  notificationsOpen: boolean
  openQuickCreate: () => void
  closeQuickCreate: () => void
  openSearch: () => void
  closeSearch: () => void
  openNotifications: () => void
  closeNotifications: () => void
}

export const useUiStore = create<UiState>((set) => ({
  quickCreateOpen: false,
  searchOpen: false,
  notificationsOpen: false,
  openQuickCreate: () => set({ quickCreateOpen: true }),
  closeQuickCreate: () => set({ quickCreateOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openNotifications: () => set({ notificationsOpen: true }),
  closeNotifications: () => set({ notificationsOpen: false }),
}))
