import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'
import { useContactsStore } from '@/store/contactsStore'
import type { UsageMode, User } from '@/types'

interface ProfileRow {
  id: string
  name: string
  email: string
  avatar_color: string
  usage_mode: UsageMode
  created_at: string
}

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
    usageMode: row.usage_mode,
    createdAt: row.created_at,
  }
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) return null
  return mapProfile(data)
}

const AVATAR_COLORS = ['#7C5CFF', '#34D399', '#F5A524', '#F5455C', '#3B9EFF', '#FF7CE0']

function translateAuthError(message: string): string {
  if (message.includes('already registered')) return 'Já existe uma conta com este e-mail.'
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('Password should be at least')) return 'A senha precisa ter ao menos 6 caracteres.'
  return message
}

interface AuthState {
  currentUserId: string | null
  profile: User | null
  authReady: boolean
  hasSeenOnboarding: boolean
  hasHydrated: boolean

  signup: (name: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
  setUsageMode: (mode: UsageMode) => Promise<void>
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatarColor'>>) => Promise<void>
  completeOnboarding: () => void
  deleteAccount: () => Promise<void>
  currentUser: () => User | undefined
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      profile: null,
      authReady: false,
      hasSeenOnboarding: false,
      hasHydrated: false,

      signup: async (name, email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name: name.trim(), avatar_color: avatarColor } },
        })
        if (error) return { ok: false, error: translateAuthError(error.message) }
        if (data.user) {
          const profile = await fetchProfile(data.user.id)
          set({ currentUserId: data.user.id, profile })
        }
        return { ok: true }
      },

      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (error) return { ok: false, error: translateAuthError(error.message) }
        if (data.user) {
          const profile = await fetchProfile(data.user.id)
          set({ currentUserId: data.user.id, profile })
        }
        return { ok: true }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ currentUserId: null, profile: null })
      },

      setUsageMode: async (mode) => {
        const id = get().currentUserId
        if (!id) return
        set((state) => ({ profile: state.profile ? { ...state.profile, usageMode: mode } : state.profile }))
        await supabase.from('profiles').update({ usage_mode: mode }).eq('id', id)
      },

      updateProfile: async (patch) => {
        const id = get().currentUserId
        if (!id) return
        set((state) => ({ profile: state.profile ? { ...state.profile, ...patch } : state.profile }))
        useDataStore.getState().syncSelfProfile(patch)
        const updates: Record<string, string> = {}
        if (patch.name !== undefined) updates.name = patch.name
        if (patch.avatarColor !== undefined) updates.avatar_color = patch.avatarColor
        await supabase.from('profiles').update(updates).eq('id', id)
      },

      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      // Apagar a conta de verdade (auth.users) exige privilégio de service role,
      // que não existe no client — por ora isso desloga o dispositivo; remoção
      // definitiva fica para um fluxo futuro via Edge Function.
      deleteAccount: async () => {
        await supabase.auth.signOut()
        set({ currentUserId: null, profile: null })
      },

      currentUser: () => get().profile ?? undefined,
    }),
    {
      name: 'taskez-auth',
      partialize: (state) => ({ hasSeenOnboarding: state.hasSeenOnboarding }),
    },
  ),
)

// Marca quando a reidratação do localStorage termina, para a UI poder aguardá-la
// (ver App.tsx) em vez de renderizar com hasSeenOnboarding ainda no valor padrão
// (false) e mandar o usuário de volta pro onboarding a cada abertura do app.
// Precisa ficar FORA do `persist(...)` acima: como localStorage é síncrono, o
// zustand resolve essa reidratação de forma síncrona, ainda durante o `create()` —
// ou seja, antes de `useAuthStore` terminar de ser atribuída. Um `onRehydrateStorage`
// que referenciasse `useAuthStore` ali dentro cairia num ReferenceError de TDZ
// (silenciosamente engolido pelo próprio zustand), deixando hasHydrated travado em
// false para sempre — e a tela do app permanentemente em branco.
useAuthStore.persist.onFinishHydration(() => useAuthStore.setState({ hasHydrated: true }))
if (useAuthStore.persist.hasHydrated()) useAuthStore.setState({ hasHydrated: true })

supabase.auth.onAuthStateChange((_event, session) => {
  const userId = session?.user?.id ?? null
  if (!userId) {
    useAuthStore.setState({ currentUserId: null, profile: null, authReady: true })
    useDataStore.getState().resetWorkspaceData()
    useContactsStore.setState({ contacts: [] })
    return
  }
  fetchProfile(userId).then((profile) => {
    useAuthStore.setState({ currentUserId: userId, profile, authReady: true })
  })
  void useContactsStore.getState().fetchContacts()
})
