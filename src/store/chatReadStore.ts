import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatReadState {
  lastReadAt: Record<string, string>
  markChatRead: (userId: string, projectId: string, createdAt: string) => void
}

const readKey = (userId: string, projectId: string) => `${userId}:${projectId}`

export const useChatReadStore = create<ChatReadState>()(
  persist(
    (set) => ({
      lastReadAt: {},
      markChatRead: (userId, projectId, createdAt) =>
        set((state) => ({
          lastReadAt: { ...state.lastReadAt, [readKey(userId, projectId)]: createdAt },
        })),
    }),
    { name: 'taskez-chat-read' },
  ),
)

export function useLastChatReadAt(userId: string | undefined, projectId: string | undefined) {
  return useChatReadStore((state) => (userId && projectId ? state.lastReadAt[readKey(userId, projectId)] : undefined))
}
