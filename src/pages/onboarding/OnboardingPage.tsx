import { LayoutGrid, Sparkles, Users, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'

const slides = [
  {
    icon: LayoutGrid,
    title: 'Seu dashboard, do seu jeito',
    description: 'Monte um espaço de trabalho com widgets que você escolhe, na ordem que você quiser.',
    color: '#7C5CFF',
  },
  {
    icon: Zap,
    title: 'Tarefas e projetos, sem fricção',
    description: 'Crie, organize e acompanhe tudo em poucos toques. Simples assim.',
    color: '#3B9EFF',
  },
  {
    icon: Users,
    title: 'Trabalhe em equipe, se quiser',
    description: 'Convide colegas, acompanhe a carga de trabalho e converse sem sair do app.',
    color: '#34D399',
  },
  {
    icon: Sparkles,
    title: 'Vamos organizar seu dia',
    description: 'Design bonito, foco no que importa. Crie sua conta e comece agora.',
    color: '#F5A524',
  },
]

export function OnboardingPage() {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding)
  const touchStartX = useRef<number | null>(null)

  const slide = slides[index]!
  const isLast = index === slides.length - 1

  function finish() {
    completeOnboarding()
    navigate('/signup')
  }

  function handleSkip() {
    confirmAction({
      title: 'Pular apresentação',
      description: 'Você não vai ver essa apresentação de novo ao abrir o app.',
      confirmLabel: 'Não mostrar novamente',
      onConfirm: finish,
    })
  }

  function next() {
    if (isLast) finish()
    else setIndex((i) => i + 1)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]!.clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0]!.clientX - touchStartX.current
    if (delta < -50 && !isLast) setIndex((i) => i + 1)
    if (delta > 50 && index > 0) setIndex((i) => i - 1)
    touchStartX.current = null
  }

  const Icon = slide.icon

  return (
    <div
      className="flex min-h-svh w-full max-w-md mx-auto flex-col bg-base px-6 pb-8 pt-[calc(env(safe-area-inset-top)+16px)]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-end">
        {!isLast && (
          <button onClick={handleSkip} className="text-sm font-semibold text-text-muted">
            Pular
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div
          className="flex h-28 w-28 items-center justify-center rounded-[32px]"
          style={{ backgroundColor: `${slide.color}22`, color: slide.color }}
        >
          <Icon size={52} strokeWidth={1.5} />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-text">{slide.title}</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">{slide.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-6 bg-accent' : 'w-2 bg-border',
              )}
            />
          ))}
        </div>
        <Button size="lg" fullWidth onClick={next}>
          {isLast ? 'Criar minha conta' : 'Próximo'}
        </Button>
        {isLast && (
          <button
            onClick={() => {
              completeOnboarding()
              navigate('/login')
            }}
            className="text-center text-sm font-semibold text-text-muted"
          >
            Já tenho uma conta
          </button>
        )}
      </div>
    </div>
  )
}
