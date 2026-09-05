import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await login(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-svh w-full max-w-md mx-auto flex-col bg-base px-6 pb-8 pt-[calc(env(safe-area-inset-top)+40px)]">
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold text-text">Bem-vindo de volta</h1>
          <p className="text-[15px] text-text-muted">Entre para continuar organizando seu dia.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="E-mail"
            type="email"
            icon={<Mail size={17} />}
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Senha"
            type="password"
            icon={<Lock size={17} />}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <button type="button" className="self-end text-sm font-semibold text-accent">
            Esqueci minha senha
          </button>
          <Button type="submit" size="lg" fullWidth className="mt-2">
            Entrar
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-text-muted">
        Não tem uma conta?{' '}
        <Link to="/signup" className="font-semibold text-accent">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
