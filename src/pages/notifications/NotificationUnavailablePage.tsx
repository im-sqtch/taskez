import { BellOff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotificationUnavailablePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const title = (location.state as { title?: string } | null)?.title

  return (
    <div className="flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+16px)] lg:mx-auto lg:w-full lg:max-w-3xl">
      <EmptyState
        icon={<BellOff size={26} />}
        title={title ? `${title} não existe mais.` : 'Este item não existe mais.'}
        description="O conteúdo dessa notificação foi excluído ou movido."
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
            Voltar ao início
          </Button>
        }
      />
    </div>
  )
}
