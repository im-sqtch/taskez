import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { useAuthStore } from '@/store/authStore'
import { useContactsStore } from '@/store/contactsStore'

interface AddContactSheetProps {
  open: boolean
  onClose: () => void
}

export function AddContactSheet({ open, onClose }: AddContactSheetProps) {
  const currentUser = useAuthStore((s) => s.currentUser())
  const inviteContact = useContactsStore((s) => s.inviteContact)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setError(null)
    setSent(false)
  }, [open])

  async function handleSubmit() {
    if (!email.trim() || !currentUser) return
    const result = await inviteContact(currentUser.id, email)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setSent(true)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Adicionar contato"
      footer={
        sent ? (
          <Button fullWidth size="lg" onClick={onClose}>
            Concluído
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={handleSubmit} disabled={!email.trim()}>
            Enviar convite
          </Button>
        )
      }
    >
      {sent ? (
        <p className="text-sm text-text-muted">
          Convite enviado! Quando a pessoa aceitar, ela aparece na sua lista de contatos.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <Field
            label="E-mail da pessoa"
            type="email"
            icon={<Mail size={17} />}
            placeholder="colega@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error ?? undefined}
            autoFocus
          />
          <p className="text-xs text-text-faint">
            Só é possível adicionar quem já tem conta no TaskEz — não enviamos e-mail de convite.
          </p>
        </div>
      )}
    </Sheet>
  )
}
