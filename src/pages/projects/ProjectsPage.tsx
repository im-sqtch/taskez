import { AnimatePresence, motion } from 'framer-motion'
import { FolderKanban, Plus, SlidersHorizontal, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet'
import { ProjectCardContent } from '@/components/projects/ProjectCardContent'
import { ReorderProjectsSheet } from '@/components/projects/ReorderProjectsSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { useCurrentWorkspace, useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import type { ProjectStatus } from '@/types'

const filters: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'archived', label: 'Arquivados' },
]

const filterOrder = filters.map((filter) => filter.value)

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -48 : 48 }),
}

export function ProjectsPage({ selectedId }: { selectedId?: string } = {}) {
  const workspace = useCurrentWorkspace()
  const projects = useWorkspaceProjects()
  const tasks = useWorkspaceTasks()
  const [filter, setFilter] = useState<ProjectStatus>('active')
  const [slideDirection, setSlideDirection] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [cardLayoutEnabled, setCardLayoutEnabled] = useState(false)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const list = projects.filter((p) => p.status === filter)
    const selectedIndex = selectedId ? list.findIndex((p) => p.id === selectedId) : -1
    if (selectedIndex <= 0) return list
    const reordered = [...list]
    const [selected] = reordered.splice(selectedIndex, 1)
    reordered.unshift(selected)
    return reordered
  }, [projects, filter, selectedId])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  // A projeção de layout do Framer Motion tenta compensar a posição dos cards
  // enquanto o AppShell ainda move a página no eixo Y, fazendo-os parecer andar
  // no sentido contrário. Ela só é necessária depois da entrada, para animar a
  // reordenação do projeto selecionado no desktop.
  useEffect(() => {
    if (!isDesktop) return
    const timer = window.setTimeout(() => setCardLayoutEnabled(true), 240)
    return () => window.clearTimeout(timer)
  }, [isDesktop])

  // No desktop, escolher um projeto reordena a lista (ele vai pro topo).
  // Rola a tela pro topo junto, pra o usuário acompanhar o item que "subiu"
  // em vez de a mudança acontecer fora da área visível.
  useEffect(() => {
    if (!selectedId) return
    if (!isDesktop) return
    listRef.current?.closest('[data-scroll-pane]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedId, isDesktop])

  function progressFor(projectId: string) {
    const projectTasks = tasks.filter((t) => t.projectId === projectId)
    if (projectTasks.length === 0) return { total: 0, completed: 0 }
    return {
      total: projectTasks.length,
      completed: projectTasks.filter((t) => t.status === 'done').length,
    }
  }

  function selectFilter(nextFilter: ProjectStatus) {
    if (nextFilter === filter) return
    setSlideDirection(filterOrder.indexOf(nextFilter) > filterOrder.indexOf(filter) ? 1 : -1)
    setFilter(nextFilter)
  }

  return (
    <div ref={listRef} className="flex flex-col gap-5">
      <div className="sticky top-0 z-20 -mb-4 flex flex-col gap-5 bg-base pb-4">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="min-w-0">
          <p className="truncate text-xs text-text-muted lg:hidden">{workspace?.name}</p>
          <h1 className="text-2xl font-bold text-text">Projetos</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setReorderOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-text"
            aria-label="Ordenar projetos"
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            onClick={() => navigate('/files')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-text"
            aria-label="Enviar arquivo"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white"
            aria-label="Novo projeto"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="flex gap-2 px-5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => selectFilter(f.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              filter === f.value ? 'bg-accent text-white' : 'bg-surface text-text-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      </div>

      <div className="overflow-hidden px-5">
        <AnimatePresence initial={false} custom={slideDirection} mode="wait">
          <motion.div
            key={filter}
            inherit={false}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-3"
          >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={24} />}
            title="Nenhum projeto por aqui"
            description="Crie um novo projeto para começar a organizar seu trabalho."
          />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((p) => {
              const { total, completed } = progressFor(p.id)
              return (
                <motion.button
                  key={p.id}
                  layout={isDesktop && cardLayoutEnabled}
                  layoutId={isDesktop && cardLayoutEnabled ? p.id : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
                  // No desktop, o AppShell já anima a página inteira no eixo Y.
                  // Um segundo deslocamento vertical no card competia com essa
                  // direção ao entrar em Projetos. No mobile ele continua útil
                  // para inclusões na lista, onde a navegação principal é lateral.
                  initial={isDesktop ? false : { opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
                    p.id === selectedId ? 'border-accent bg-accent-soft' : 'border-border-soft bg-surface',
                  )}
                >
                  <ProjectCardContent project={p} completed={completed} total={total} />
                </motion.button>
              )
            })}
          </AnimatePresence>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ProjectFormSheet open={formOpen} onClose={() => setFormOpen(false)} onCreated={(id) => navigate(`/projects/${id}`)} />
      <ReorderProjectsSheet open={reorderOpen} onClose={() => setReorderOpen(false)} projects={filtered} />
    </div>
  )
}
