import type { Comment } from '@/types'

interface TaskCommentMessage {
  userId: string
  taskId: string
  comment: Comment
}

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('taskez-task-comments')

export function publishTaskComment(message: TaskCommentMessage) {
  channel?.postMessage(message)
}

export function subscribeTaskComments(listener: (message: TaskCommentMessage) => void) {
  if (!channel) return () => {}
  const handleMessage = (event: MessageEvent<TaskCommentMessage>) => listener(event.data)
  channel.addEventListener('message', handleMessage)
  return () => channel.removeEventListener('message', handleMessage)
}
