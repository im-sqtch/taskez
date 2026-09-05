import { Lock, Mail, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

export function SignupPage() {
  const signup = useAuthStore((s) => s.signup)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email])
  const passwordValid = password.length >= 6
  const nameValid = name.trim().length >= 2
  const canSubmit = emailValid && passwordValid && nameValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    const result = await signup(name, email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/usage-picker')
  }

  return (
    <div className="flex min-h-svh w-full max-w-md mx-auto flex-col bg-base px-6 pb-8 pt-[calc(env(safe-area-inset-top)+40px)]">
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold text-text">Vamos organizar seu dia</h1>
          <p className="text-[15px] text-text-muted">Crie sua conta em menos de um minuto.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Nome"
            icon={<User size={17} />}
            placeholder="Como podemos te chamar?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !nameValid ? 'Informe pelo menos 2 caracteres.' : undefined}
          />
          <Field
            label="E-mail"
            type="email"
            icon={<Mail size={17} />}
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={touched && !emailValid ? 'Informe um e-mail válido.' : undefined}
          />
          <Field
            label="Senha"
            type="password"
            icon={<Lock size={17} />}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={touched && !passwordValid ? 'A senha precisa ter ao menos 6 caracteres.' : undefined}
          />
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <Button type="submit" size="lg" fullWidth className="mt-2">
            Criar conta
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-text-muted">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-semibold text-accent">
          Entrar
        </Link>
      </p>
    </div>
  )
}
