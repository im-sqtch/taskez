import type { TeamMember } from '@/types'

export function ownAuthorIds(userId: string, workspaceId: string, team: TeamMember[]): Set<string> {
  const ids = new Set([userId])
  for (const member of team) {
    if (member.workspaceId === workspaceId && (member.linkedUserId === userId || member.isSelf)) {
      ids.add(member.id)
    }
  }
  return ids
}
