import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task } from '@/types'

interface CommentReadState {
  lastReadAt: Record<string, string>
  lastReadCommentId: Record<string, string>
  markCommentsRead: (userId: string, taskId: string, comment: { id: string; createdAt: string }) => void
}

export const useCommentReadStore = create<CommentReadState>()(
  persist(
    (set) => ({
      lastReadAt: {},
      lastReadCommentId: {},
      markCommentsRead: (userId, taskId, comment) => set((state) => {
        const key = `${userId}:${taskId}`
        if (state.lastReadCommentId[key] === comment.id) return state
        return {
          lastReadAt: { ...state.lastReadAt, [key]: comment.createdAt },
          lastReadCommentId: { ...state.lastReadCommentId, [key]: comment.id },
        }
      }),
    }),
    { name: 'taskez-comment-read' },
  ),
)

export function hasUnreadComments(
  task: Task,
  userId: string,
  readState: Pick<CommentReadState, 'lastReadAt' | 'lastReadCommentId'>,
) {
  if (task.comments.length === 0) return false
  const key = `${userId}:${task.id}`
  const readCommentId = readState.lastReadCommentId[key]
  let readIndex = readCommentId ? task.comments.findIndex((comment) => comment.id === readCommentId) : -1

  // Compatibilidade com o formato anterior: localiza na lista o comentário que
  // correspondia ao horário salvo. Depois disso, comentários novos são detectados
  // pela posição/ID, sem depender do relógio de outros dispositivos.
  if (readIndex < 0) {
    const readAt = readState.lastReadAt[key]
    if (readAt) {
      readIndex = task.comments.findLastIndex((comment) => comment.createdAt === readAt)
    }
  }

  return readIndex < task.comments.length - 1
}
