import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { MentionText } from '@/components/ui/MentionText'
import { MessageComposer } from '@/components/ui/MessageComposer'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useDataStore, useWorkspaceTeam } from '@/store/dataStore'

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function ProjectChat({ projectId }: { projectId: string }) {
  const allMessages = useDataStore((s) => s.chatMessages)
  const workspaceId = useDataStore((s) => s.projects.find((p) => p.id === projectId)?.workspaceId)
  const team = useWorkspaceTeam()
  const addChatMessage = useDataStore((s) => s.addChatMessage)
  const currentUser = useAuthStore((s) => s.currentUser())
  const [text, setText] = useState('')

  const messages = allMessages.filter((m) => m.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const selfId = team.find((m) => m.isSelf)?.id

  // Rola a página inteira (não um contêiner interno) até o fim, já que o app usa
  // scroll de página e o AppShell reserva espaço embaixo para a tab bar fixa.
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight })
  }, [messages.length])

  function isOwnMessage(authorId: string) {
    return authorId === currentUser?.id || authorId === selfId
  }

  function authorFor(authorId: string) {
    if (isOwnMessage(authorId) && currentUser) {
      return { name: currentUser.name, avatarColor: currentUser.avatarColor }
    }
    const member = team.find((m) => m.id === authorId)
    return member ? { name: member.name, avatarColor: member.avatarColor } : { name: 'Alguém', avatarColor: '#62667A' }
  }

  function handleSend() {
    if (!text.trim() || !currentUser || !selfId) return
    addChatMessage(projectId, selfId, text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <EmptyState icon={<MessageCircle size={22} />} title="Nenhuma mensagem ainda" description="Converse com a equipe deste projeto." />
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const own = isOwnMessage(m.authorId)
            const author = authorFor(m.authorId)
            return (
              <div key={m.id} className={cn('flex items-end gap-2', own && 'flex-row-reverse')}>
                <Avatar name={author.name} color={author.avatarColor} size="xs" />
                <div className={cn('flex max-w-[75%] flex-col gap-0.5', own && 'items-end')}>
                  {!own && <span className="px-1 text-[11px] font-medium text-text-faint">{author.name.split(' ')[0]}</span>}
                  <div
                    className={cn(
                      // whitespace-pre-wrap preserva as quebras de linha digitadas;
                      // break-words evita que uma palavra/URL longa estoure o balão.
                      'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm',
                      own ? 'rounded-br-sm bg-accent text-white' : 'rounded-bl-sm bg-surface text-text',
                    )}
                  >
                    <MentionText text={m.text} workspaceId={workspaceId} variant={own ? 'onAccent' : 'default'} />
                  </div>
                  <span className="px-1 text-[10px] text-text-faint">{formatTime(m.createdAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <MessageComposer
        value={text}
        onChange={setText}
        onSubmit={handleSend}
        placeholder="Escreva uma mensagem... Use @ para mencionar"
        sendLabel="Enviar mensagem"
        workspaceId={workspaceId}
      />
    </div>
  )
}
