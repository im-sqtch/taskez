import { useAuthStore } from '@/store/authStore'
import { hasUnreadComments, useCommentReadStore } from '@/store/commentReadStore'
import { useDataStore } from '@/store/dataStore'

export function CommentUnreadBadge({ taskId, projectId }: { taskId?: string; projectId?: string }) {
  const userId = useAuthStore((s) => s.currentUserId)
  const lastReadAt = useCommentReadStore((s) => s.lastReadAt)
  const lastReadCommentId = useCommentReadStore((s) => s.lastReadCommentId)
  const hasUnread = useDataStore((s) => Boolean(userId && s.tasks.some((task) =>
    (taskId ? task.id === taskId : Boolean(projectId && task.projectId === projectId))
    && hasUnreadComments(task, userId, { lastReadAt, lastReadCommentId }),
  )))

  if (!hasUnread) return null

  const label = projectId ? 'Novos comentários nas tarefas do projeto' : 'Novos comentários na tarefa'
  return (
    <span
      className={projectId
        ? 'h-3 w-3 shrink-0 rounded-full bg-blue-500 ring-2 ring-surface'
        : 'inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500'}
      role="img"
      aria-label={label}
      title={label}
    />
  )
}
