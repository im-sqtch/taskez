import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task } from '@/types'

interface CommentReadState {
  lastReadAt: Record<string, string>
  markCommentsRead: (userId: string, taskId: string, createdAt: string) => void
}

export const useCommentReadStore = create<CommentReadState>()(
  persist(
    (set) => ({
      lastReadAt: {},
      markCommentsRead: (userId, taskId, createdAt) => set((state) => {
        const key = `${userId}:${taskId}`
        if (state.lastReadAt[key] >= createdAt) return state
        return { lastReadAt: { ...state.lastReadAt, [key]: createdAt } }
      }),
    }),
    { name: 'taskez-comment-read' },
  ),
)

export function hasUnreadComments(task: Task, userId: string, lastReadAt: Record<string, string>) {
  const readAt = lastReadAt[`${userId}:${task.id}`]
  return task.comments.some((comment) => comment.authorId !== userId && (!readAt || comment.createdAt > readAt))
}
