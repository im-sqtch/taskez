import {
  CalendarDays,
  CheckSquare,
  Flame,
  FolderKanban,
  LayoutGrid,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { WidgetSize, WidgetType } from '@/types'

interface WidgetCatalogEntry {
  type: WidgetType
  label: string
  description: string
  icon: LucideIcon
  allowedSizes: WidgetSize[]
  defaultSize: WidgetSize
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetCatalogEntry> = {
  summary: {
    type: 'summary',
    label: 'Resumo de Produtividade',
    description: 'Progresso da semana, streak e histórico de conclusão.',
    icon: LayoutGrid,
    allowedSizes: ['S', 'M', 'L', 'LH'],
    defaultSize: 'L',
  },
  tasks: {
    type: 'tasks',
    label: 'Tarefas do Dia',
    description: 'Próximas tarefas pendentes, por prazo.',
    icon: CheckSquare,
    allowedSizes: ['S', 'M', 'L', 'LH'],
    defaultSize: 'M',
  },
  calendar: {
    type: 'calendar',
    label: 'Calendário',
    description: 'Prazos das tarefas por dia. Toque em um dia para ver a lista.',
    icon: CalendarDays,
    allowedSizes: ['S', 'M', 'L', 'LH'],
    defaultSize: 'L',
  },
  projects: {
    type: 'projects',
    label: 'Projetos Ativos',
    description: 'Progresso dos projetos em andamento.',
    icon: FolderKanban,
    allowedSizes: ['S', 'M', 'L', 'LH', 'LS'],
    defaultSize: 'M',
  },
  team: {
    type: 'team',
    label: 'Minha Equipe',
    description: 'Status e carga de trabalho da equipe.',
    icon: Users,
    allowedSizes: ['S', 'M'],
    defaultSize: 'S',
  },
  profile: {
    type: 'profile',
    label: 'Meu Perfil',
    description: 'Acesso rápido ao seu perfil, com estatísticas no tamanho Médio.',
    icon: User,
    allowedSizes: ['S', 'M'],
    defaultSize: 'S',
  },
  shortcuts: {
    type: 'shortcuts',
    label: 'Ações Rápidas',
    description: 'Atalhos para criar e encontrar coisas rapidamente.',
    icon: Sparkles,
    // Por enquanto só o tamanho Médio (grade 2x2) está disponível.
    allowedSizes: ['M'],
    defaultSize: 'M',
  },
  utility: {
    type: 'utility',
    label: 'Sequência & Foco',
    description: 'Sua sequência de dias e timers de pomodoro e descanso.',
    icon: Flame,
    allowedSizes: ['S', 'M', 'L', 'LH'],
    defaultSize: 'M',
  },
}

export const WIDGET_TYPES = Object.keys(WIDGET_CATALOG) as WidgetType[]

export const SIZE_LABELS: Record<WidgetSize, string> = {
  S: 'Pequeno',
  M: 'Médio',
  L: 'Grande · Inteiro',
  LH: 'Grande · Metade',
  LS: 'Grande · Dividido',
}

export function nextSize(current: WidgetSize, allowed: WidgetSize[]): WidgetSize {
  const order: WidgetSize[] = ['S', 'M', 'L', 'LH', 'LS']
  const allowedInOrder = order.filter((s) => allowed.includes(s))
  const idx = allowedInOrder.indexOf(current)
  return allowedInOrder[(idx + 1) % allowedInOrder.length]!
}

// L, LH e LS mostram o mesmo conteúdo "grande" do widget — só o espaço que
// ocupam no grid do desktop (e, no caso do projects, o número de colunas
// internas) muda. Os componentes de widget usam isto pra decidir o que
// renderizar sem precisar conhecer as variantes de layout.
export function widgetContentSize(size: WidgetSize): 'S' | 'M' | 'L' {
  return size === 'LH' || size === 'LS' ? 'L' : size
}
