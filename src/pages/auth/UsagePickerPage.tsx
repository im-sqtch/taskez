import { Briefcase, User, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { UsageMode } from '@/types'

const options: { value: UsageMode; label: string; description: string; icon: typeof User }[] = [
  { value: 'personal', label: 'Uso pessoal', description: 'Organizar minhas próprias tarefas e projetos.', icon: User },
  { value: 'team', label: 'Equipe', description: 'Colaborar com colegas em projetos compartilhados.', icon: Users },
  { value: 'client', label: 'Clientes', description: 'Gerenciar entregas e projetos para clientes.', icon: Briefcase },
]

export function UsagePickerPage() {
  const [selected, setSelected] = useState<UsageMode>('personal')
  const setUsageMode = useAuthStore((s) => s.setUsageMode)
  const seedIfEmpty = useDataStore((s) => s.seedIfEmpty)
  const navigate = useNavigate()

  async function handleContinue() {
    void setUsageMode(selected)
    await seedIfEmpty()
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-svh w-full max-w-md mx-auto flex-col bg-base px-6 pb-8 pt-[calc(env(safe-area-inset-top)+40px)]">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-text">Como você vai usar o TaskEz?</h1>
        <p className="text-[15px] text-text-muted">Isso nos ajuda a preparar seu dashboard inicial.</p>
      </div>

      <div className="mt-8 flex flex-1 flex-col gap-3">
        {options.map((opt) => {
          const Icon = opt.icon
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={cn(
                'flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                active ? 'border-accent bg-accent-soft' : 'border-border bg-surface',
              )}
            >
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-accent text-white' : 'bg-surface-alt text-text-muted',
                )}
              >
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-text">{opt.label}</p>
                <p className="text-sm text-text-muted">{opt.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <Button size="lg" fullWidth onClick={handleContinue}>
        Continuar
      </Button>
    </div>
  )
}
