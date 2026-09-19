import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, FolderKanban, ListTodo, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { PriorityBadge } from '@/components/ui/Badge'
import { useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'

export function SearchOverlay() {
  const open = useUiStore((s) => s.searchOpen)
  const close = useUiStore((s) => s.closeSearch)
  const tasks = useWorkspaceTasks()
  const projects = useWorkspaceProjects()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { tasks: [], projects: [] }
    return {
      tasks: tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8),
      projects: projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6),
    }
  }, [query, tasks, projects])

  const hasResults = results.tasks.length > 0 || results.projects.length > 0

  function handleClose() {
    close()
    setQuery('')
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-base lg:items-center lg:justify-start lg:bg-black/60 lg:pt-[10vh]"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <motion.div
            className="flex w-full flex-1 flex-col lg:max-h-[70vh] lg:w-full lg:max-w-xl lg:flex-none lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-surface-alt lg:shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ willChange: 'transform, opacity' }}
          >
        <div className="flex shrink-0 items-center gap-2 border-b border-border-soft px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 lg:pt-4">
          <button
            onClick={handleClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted lg:hidden"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tarefas e projetos..."
              className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-text placeholder:text-text-faint outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text lg:flex"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!query.trim() ? (
            <EmptyState icon={<Search size={24} />} title="Busque em todo o TaskEz" description="Encontre tarefas e projetos rapidamente." />
          ) : !hasResults ? (
            <EmptyState icon={<Search size={24} />} title="Nada encontrado" description={`Nenhum resultado para "${query}"`} />
          ) : (
            <div className="flex flex-col gap-5">
              {results.projects.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Projetos</p>
                  {results.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        handleClose()
                        navigate(`/projects/${p.id}`)
                      }}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-left"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        <FolderKanban size={16} />
                      </div>
                      <p className="font-medium text-text">{p.name}</p>
                    </button>
                  ))}
                </div>
              )}
              {results.tasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Tarefas</p>
                  {results.tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        handleClose()
                        navigate(`/tasks/${t.id}`)
                      }}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-left"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
                        <ListTodo size={16} />
                      </div>
                      <p className="flex-1 font-medium text-text">{t.title}</p>
                      <PriorityBadge priority={t.priority} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
