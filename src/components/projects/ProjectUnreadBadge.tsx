import { useAuthStore } from '@/store/authStore'
import { useLastChatReadAt } from '@/store/chatReadStore'
import { useDataStore } from '@/store/dataStore'
import { CommentUnreadBadge } from '@/components/tasks/CommentUnreadBadge'

export function ProjectUnreadBadge({ projectId }: { projectId: string }) {
  const userId = useAuthStore((s) => s.currentUserId)
  const lastReadAt = useLastChatReadAt(userId ?? undefined, projectId)
  const hasUnread = useDataStore((s) => Boolean(userId) && s.chatMessages.some(
    (message) => message.projectId === projectId && (!lastReadAt || message.createdAt > lastReadAt),
  ))

  return (
    <>
      {hasUnread && (
        <span
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-danger ring-2 ring-surface"
          role="img"
          aria-label="Novas mensagens no chat do projeto"
          title="Novas mensagens no chat do projeto"
        />
      )}
      <CommentUnreadBadge projectId={projectId} />
    </>
  )
}
