import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { simpleHash } from '@/lib/utils'
import type { UsageMode, User } from '@/types'

interface AuthState {
  users: User[]
  currentUserId: string | null
  hasSeenOnboarding: boolean
  signup: (name: string, email: string, password: string) => { ok: true } | { ok: false; error: string }
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string }
  logout: () => void
  setUsageMode: (mode: UsageMode) => void
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatarColor'>>) => void
  completeOnboarding: () => void
  deleteAccount: () => void
  currentUser: () => User | undefined
}

const AVATAR_COLORS = ['#7C5CFF', '#34D399', '#F5A524', '#F5455C', '#3B9EFF', '#FF7CE0']

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      hasSeenOnboarding: false,

      signup: (name, email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        if (get().users.some((u) => u.email === normalizedEmail)) {
          return { ok: false, error: 'Já existe uma conta com este e-mail.' }
        }
        const user: User = {
          id: uuid(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: simpleHash(password),
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
          usageMode: 'personal',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ users: [...state.users, user], currentUserId: user.id }))
        return { ok: true }
      },

      login: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const user = get().users.find((u) => u.email === normalizedEmail)
        if (!user || user.passwordHash !== simpleHash(password)) {
          return { ok: false, error: 'E-mail ou senha incorretos.' }
        }
        set({ currentUserId: user.id })
        return { ok: true }
      },

      logout: () => set({ currentUserId: null }),

      setUsageMode: (mode) => {
        const id = get().currentUserId
        if (!id) return
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, usageMode: mode } : u)),
        }))
      },

      updateProfile: (patch) => {
        const id = get().currentUserId
        if (!id) return
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }))
      },

      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      deleteAccount: () => {
        const id = get().currentUserId
        if (!id) return
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          currentUserId: null,
        }))
      },

      currentUser: () => get().users.find((u) => u.id === get().currentUserId),
    }),
    { name: 'taskez-auth' },
  ),
)
