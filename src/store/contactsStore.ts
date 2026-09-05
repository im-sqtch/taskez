import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { Contact } from '@/types'

interface ContactRow {
  id: string
  from_user_id: string
  to_user_id: string
  status: Contact['status']
  created_at: string
}

interface ContactProfile {
  id: string
  name: string
  email: string
  avatarColor: string
}

function mapContact(row: ContactRow): Contact {
  return { id: row.id, fromUserId: row.from_user_id, toUserId: row.to_user_id, status: row.status, createdAt: row.created_at }
}

async function fetchContactProfiles(ids: string[]): Promise<Record<string, ContactProfile>> {
  if (ids.length === 0) return {}
  const { data } = await supabase.rpc('get_contact_profiles', { p_ids: ids })
  const map: Record<string, ContactProfile> = {}
  for (const row of (data ?? []) as { id: string; name: string; email: string; avatar_color: string }[]) {
    map[row.id] = { id: row.id, name: row.name, email: row.email, avatarColor: row.avatar_color }
  }
  return map
}

interface ContactsState {
  contacts: Contact[]
  profiles: Record<string, ContactProfile>
  fetchContacts: () => Promise<void>
  inviteContact: (fromUserId: string, email: string) => Promise<{ ok: true } | { ok: false; error: string }>
  acceptContact: (id: string) => Promise<void>
  declineContact: (id: string) => Promise<void>
}

export const useContactsStore = create<ContactsState>()((set, get) => ({
  contacts: [],
  profiles: {},

  fetchContacts: async () => {
    const userId = useAuthStore.getState().currentUserId
    if (!userId) return
    const { data } = await supabase.from('contacts').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    const contacts = (data ?? []).map((r) => mapContact(r as ContactRow))
    const otherIds = [...new Set(contacts.map((c) => (c.fromUserId === userId ? c.toUserId : c.fromUserId)))]
    const missing = otherIds.filter((id) => !get().profiles[id])
    const fetched = await fetchContactProfiles(missing)
    set((state) => ({ contacts, profiles: { ...state.profiles, ...fetched } }))
  },

  // "outros usuários do sistema" agora são contas reais do Supabase — a busca usa a
  // RPC find_profile_by_email (security definer) porque a tabela profiles só permite
  // select da própria linha via RLS.
  inviteContact: async (fromUserId, email) => {
    const normalizedEmail = email.trim().toLowerCase()
    const { data: matches } = await supabase.rpc('find_profile_by_email', { p_email: normalizedEmail })
    const toUser = (matches as { id: string; name: string; avatar_color: string }[] | null)?.[0]
    if (!toUser) {
      return { ok: false, error: 'Nenhum usuário encontrado com esse e-mail.' }
    }
    if (toUser.id === fromUserId) {
      return { ok: false, error: 'Você não pode adicionar a si mesmo.' }
    }
    const existing = get().contacts.find(
      (c) =>
        (c.fromUserId === fromUserId && c.toUserId === toUser.id) ||
        (c.fromUserId === toUser.id && c.toUserId === fromUserId),
    )
    if (existing) {
      return { ok: false, error: existing.status === 'accepted' ? 'Vocês já são contatos.' : 'Já existe um convite pendente com essa pessoa.' }
    }
    const id = uuid()
    set((state) => ({
      contacts: [...state.contacts, { id, fromUserId, toUserId: toUser.id, status: 'pending', createdAt: new Date().toISOString() }],
      profiles: { ...state.profiles, [toUser.id]: { id: toUser.id, name: toUser.name, email: normalizedEmail, avatarColor: toUser.avatar_color } },
    }))
    await supabase.from('contacts').insert({ id, from_user_id: fromUserId, to_user_id: toUser.id, status: 'pending' })
    return { ok: true }
  },

  acceptContact: async (id) => {
    const previous = get().contacts.find((c) => c.id === id)
    const userId = useAuthStore.getState().currentUserId
    set((state) => ({
      contacts: state.contacts.map((c) => (c.id === id ? { ...c, status: 'accepted' as const } : c)),
    }))
    const { error } = await supabase.from('contacts').update({ status: 'accepted' }).eq('id', id)
    if (error) {
      console.error('[contacts] falha ao aceitar convite', error)
      // Reverte o otimismo local: sem isso, a UI mostraria "aceito" mesmo que o
      // banco tenha rejeitado a escrita (ex.: política de RLS desalinhada).
      set((state) => ({
        contacts: previous ? state.contacts.map((c) => (c.id === id ? previous : c)) : state.contacts,
      }))
      useDataStore.getState().addNotification('system', 'Não foi possível aceitar o convite', 'Tente novamente em instantes.')
      return
    }
    if (previous && userId) {
      const otherId = previous.fromUserId === userId ? previous.toUserId : previous.fromUserId
      const other = get().profiles[otherId]
      if (other) {
        useDataStore.getState().addNotification('team', 'Contato adicionado', `Você e ${other.name} agora são contatos.`)
      }
    }
  },

  declineContact: async (id) => {
    const previous = get().contacts.find((c) => c.id === id)
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) }))
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) {
      console.error('[contacts] falha ao recusar convite', error)
      set((state) => (previous && !state.contacts.some((c) => c.id === id) ? { contacts: [...state.contacts, previous] } : state))
      useDataStore.getState().addNotification('system', 'Não foi possível recusar o convite', 'Tente novamente em instantes.')
    }
  },
}))

supabase
  .channel('taskez-contacts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, async (payload) => {
    const p = payload as RealtimePostgresChangesPayload<ContactRow>
    const userId = useAuthStore.getState().currentUserId
    if (!userId) return
    if (p.eventType === 'DELETE') {
      const oldId = (p.old as { id?: string }).id
      if (!oldId) return
      useContactsStore.setState((state) => ({ contacts: state.contacts.filter((c) => c.id !== oldId) }))
      return
    }
    const contact = mapContact(p.new as ContactRow)
    const otherId = contact.fromUserId === userId ? contact.toUserId : contact.fromUserId
    const alreadyKnown = Boolean(useContactsStore.getState().profiles[otherId])
    const fetched = alreadyKnown ? {} : await fetchContactProfiles([otherId])
    const wasPending = useContactsStore.getState().contacts.find((c) => c.id === contact.id)?.status === 'pending'
    useContactsStore.setState((state) => {
      const exists = state.contacts.some((c) => c.id === contact.id)
      return {
        contacts: exists ? state.contacts.map((c) => (c.id === contact.id ? contact : c)) : [...state.contacts, contact],
        profiles: { ...state.profiles, ...fetched },
      }
    })
    // Quem enviou o convite fica sabendo quando o outro lado aceita — chega aqui via
    // realtime (o `acceptContact` roda no navegador de quem aceitou, não no meu).
    if (p.eventType === 'UPDATE' && wasPending && contact.status === 'accepted' && contact.fromUserId === userId) {
      const accepter = fetched[otherId] ?? useContactsStore.getState().profiles[otherId]
      if (accepter) {
        useDataStore.getState().addNotification('team', 'Convite aceito', `${accepter.name} aceitou seu convite de contato.`)
      }
    }
  })
  .subscribe()

// Convites pendentes recebidos por este usuário (aguardando aceitar/recusar),
// já resolvidos com os dados de quem convidou.
export function usePendingInvites(userId: string | undefined) {
  const contacts = useContactsStore((s) => s.contacts)
  const profiles = useContactsStore((s) => s.profiles)
  if (!userId) return []
  return contacts
    .filter((c) => c.toUserId === userId && c.status === 'pending')
    .map((c) => ({ contact: c, fromUser: profiles[c.fromUserId] }))
    .filter((entry): entry is { contact: Contact; fromUser: ContactProfile } => Boolean(entry.fromUser))
}

// Contatos já aceitos deste usuário, resolvidos com os dados da outra pessoa.
export function useAcceptedContacts(userId: string | undefined) {
  const contacts = useContactsStore((s) => s.contacts)
  const profiles = useContactsStore((s) => s.profiles)
  if (!userId) return []
  return contacts
    .filter((c) => c.status === 'accepted' && (c.fromUserId === userId || c.toUserId === userId))
    .map((c) => {
      const otherId = c.fromUserId === userId ? c.toUserId : c.fromUserId
      return { contact: c, user: profiles[otherId] }
    })
    .filter((entry): entry is { contact: Contact; user: ContactProfile } => Boolean(entry.user))
}
