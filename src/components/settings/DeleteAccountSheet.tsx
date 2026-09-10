import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { useAuthStore } from '@/store/authStore'

interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
}

export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const navigate = useNavigate()
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPassword('')
    setError(null)
    setSubmitting(false)
  }, [open])

  async function handleSubmit() {
    if (!password) return
    setSubmitting(true)
    setError(null)
    const result = await deleteAccount(password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/login')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Excluir conta"
      footer={
        <Button variant="danger" fullWidth size="lg" onClick={handleSubmit} disabled={!password || submitting}>
          {submitting ? 'Excluindo...' : 'Excluir conta definitivamente'}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          Esta ação é permanente. Todos os seus dados são apagados, e o acesso a qualquer workspace da qual você é
          dono(a) sozinho(a) também. Se você ainda for dono(a) de uma workspace com outras pessoas, resolva isso
          primeiro (saia, transfira ou apague a workspace) — a exclusão é recusada até lá.
        </p>
        <Field
          label="Confirme sua senha atual"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          autoComplete="current-password"
          autoFocus
        />
      </div>
    </Sheet>
  )
}
