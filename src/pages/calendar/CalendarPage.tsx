import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarFilters, type CalendarFilterProject } from '@/components/calendar/CalendarFilters'
import { isOccurrence, markDragEnd } from '@/components/calendar/calendarShared'
import { ChipBody } from '@/components/calendar/EventChip'
import { AgendaView, CalendarTaskList, DayHeading, DayView, MobileWeek } from '@/components/calendar/ListViews'
import { MiniMonth } from '@/components/calendar/MiniMonth'
import { MonthView } from '@/components/calendar/MonthView'
import { TaskQuickView } from '@/components/calendar/TaskQuickView'
import { HOUR_HEIGHT, TimeGrid } from '@/components/calendar/TimeGrid'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { addDays, compareDueTime, dateKey, dueDateKey, formatFullDate, formatMonthTitle, formatWeekTitle, keyToDate, keyToDueDate, minutesToTime, weekGrid } from '@/lib/calendar'
import { projectRecurringTasks } from '@/lib/recurrenceProjection'
import { useDashboardViewport } from '@/lib/dashboardViewport'
import { cn } from '@/lib/utils'
import { useDataStore, useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'
import type { Project, Task } from '@/types'

type CalendarView = 'day' | 'week' | 'month' | 'agenda'
const VIEWS: { value: CalendarView; label: string; key: string }[] = [
  { value: 'day', label: 'Dia', key: 'd' },
  { value: 'week', label: 'Semana', key: 'w' },
  { value: 'month', label: 'Mês', key: 'm' },
  { value: 'agenda', label: 'Agenda', key: 'a' },
]
const SIDEBAR_STORAGE_KEY = 'taskez-calendar-sidebar'

const iconButton = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-accent'

function validDate(key: string | null): key is string {
  return Boolean(key && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(keyToDate(key)) === key)
}

// Muda de mês mantendo o dia (limitado ao último dia do mês de destino).
function shiftMonth(date: Date, delta: number) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + delta + 1, 0).getDate()
  return new Date(date.getFullYear(), date.getMonth() + delta, Math.min(date.getDate(), lastDay))
}

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return Boolean(element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)))
}

export function CalendarPage() {
  const tasks = useWorkspaceTasks()
  const projects = useWorkspaceProjects()
  const updateTask = useDataStore((s) => s.updateTask)
  const setQuickCreateDueDate = useUiStore((s) => s.setQuickCreateDueDate)
  const isDesktop = useDashboardViewport() === 'desktop'
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const detailId = useMatch('/calendar/:id')?.params.id
  const detailRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const returnScroll = useRef(0)
  const hadDetail = useRef(false)

  const requestedView = params.get('view')
  const view: CalendarView = VIEWS.some((v) => v.value === requestedView) ? requestedView as CalendarView : 'month'
  const selectedKey = validDate(params.get('date')) ? params.get('date')! : dateKey(new Date())
  const cursor = keyToDate(selectedKey)
  const hideParam = params.getAll('hide').join(',')
  const pickedHidden = useMemo(() => new Set(hideParam ? hideParam.split(',') : []), [hideParam])
  // Ocultar projetos concluídos e arquivados (e as tarefas deles).
  const hideClosed = params.get('closed') === 'hide'
  const showCompleted = params.get('completed') !== 'false'
  const showUndated = params.get('undated') === 'true'
  const todayKey = dateKey(new Date())

  const [miniMonth, setMiniMonth] = useState({ anchor: selectedKey, month: cursor })
  const miniCursor = miniMonth.anchor === selectedKey ? miniMonth.month : cursor
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'closed')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [create, setCreate] = useState<{ open: boolean; date?: string; time?: string }>({ open: false })
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [quickView, setQuickView] = useState<{ task: Task; anchor: HTMLElement } | null>(null)
  const [dragging, setDragging] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const hiddenProjects = useMemo(() => {
    if (!hideClosed) return pickedHidden
    return new Set([...pickedHidden, ...projects.filter((p) => p.status !== 'active').map((p) => p.id)])
  }, [hideClosed, pickedHidden, projects])
  const filterProjects: CalendarFilterProject[] = [
    ...projects.filter((p) => !hideClosed || p.status === 'active').map((p) => ({ id: p.id, name: p.name, color: p.color })),
    { id: 'standalone', name: 'Tarefas avulsas', color: 'var(--color-accent)' },
  ]

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = tasks.filter((task) => !hiddenProjects.has(task.projectId ?? 'standalone')
    && (showCompleted || task.status !== 'done')
    && (!normalizedQuery || `${task.title} ${task.description ?? ''} ${projectsById.get(task.projectId ?? '')?.name ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery)))
  // Próximas ocorrências das recorrentes (60 dias), só para exibição. Recalcula
  // quando tarefas/projetos mudam; a busca mostra apenas tarefas reais.
  const projected = useMemo(() => projectRecurringTasks(tasks, projects, new Date()), [tasks, projects])
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    const visibleProjected = normalizedQuery ? [] : projected.filter((task) => !hiddenProjects.has(task.projectId ?? 'standalone'))
    for (const task of [...filtered, ...visibleProjected]) {
      if (!task.dueDate) continue
      const key = dueDateKey(task.dueDate)
      map.set(key, [...(map.get(key) ?? []), task])
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareDueTime(a, b) || Number(a.status === 'done') - Number(b.status === 'done') || Number(isOccurrence(a)) - Number(isOccurrence(b)) || a.order - b.order)
    }
    return map
  }, [filtered, projected, normalizedQuery, hiddenProjects])
  const undated = filtered.filter((task) => !task.dueDate)
  const search = params.toString() ? `?${params}` : ''
  const taskTo = (task: Task) => `/calendar/${task.id}${search}`

  // No celular a visualização Dia já mostra a data completa no cartão; o título fica no mês.
  const periodTitle = view === 'day' && isDesktop ? formatFullDate(cursor) : view === 'week' ? formatWeekTitle(weekGrid(cursor)) : formatMonthTitle(cursor)

  // --- Navegação (tudo fica na URL: dá para voltar, recarregar e compartilhar) ---
  function updateParams(patch: Record<string, string | null>) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }
  function selectDate(date: Date, nextView?: CalendarView) {
    updateParams({ date: dateKey(date), undated: null, ...(nextView ? { view: nextView } : {}) })
  }
  function move(delta: number) {
    selectDate(view === 'month' || view === 'agenda' ? shiftMonth(cursor, delta) : addDays(cursor, delta * (view === 'week' ? 7 : 1)))
  }
  function setView(next: CalendarView) { updateParams({ view: next, undated: null }) }
  function openCreate(date?: string, time?: string) { setQuickView(null); setCreate({ open: true, date, time }) }
  function toggleProject(id: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      const hidden = new Set(next.getAll('hide'))
      if (hidden.has(id)) hidden.delete(id)
      else hidden.add(id)
      next.delete('hide')
      for (const key of hidden) next.append('hide', key)
      return next
    })
  }
  function closeSearch() { setQuery(''); setSearchOpen(false) }

  function handleDragStart(event: DragStartEvent) {
    setQuickView(null)
    setDragging((event.active.data.current as { task?: Task } | undefined)?.task ?? null)
  }
  function handleDragEnd(event: DragEndEvent) {
    markDragEnd()
    setDragging(null)
    const task = (event.active.data.current as { task?: Task } | undefined)?.task
    const target = event.over?.data.current as { dayKey?: string; zone?: 'day' | 'allday' | 'timed' } | undefined
    if (!task || !target?.dayKey || !event.over) return
    const dueDate = keyToDueDate(target.dayKey)
    if (target.zone === 'timed') {
      // Horário pela posição do topo da etiqueta solta na coluna (de 15 em 15 min).
      const pointer = event.activatorEvent as PointerEvent
      const grabOffset = pointer.clientY - (event.active.rect.current.initial?.top ?? pointer.clientY)
      const top = pointer.clientY + event.delta.y - grabOffset - event.over.rect.top
      const dueTime = minutesToTime(Math.round(((top / HOUR_HEIGHT) * 60) / 15) * 15)
      if (task.dueDate === dueDate && task.dueTime === dueTime) return
      updateTask(task.id, { dueDate, dueTime })
    } else if (target.zone === 'allday') {
      if (task.dueDate === dueDate && !task.dueTime) return
      updateTask(task.id, { dueDate, dueTime: undefined })
    } else {
      // Mês: muda só o dia e mantém o horário, como no Google Agenda.
      if (task.dueDate && dueDateKey(task.dueDate) === target.dayKey) return
      updateTask(task.id, { dueDate })
    }
  }

  // --- Efeitos ---
  useEffect(() => { localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarOpen ? 'open' : 'closed') }, [sidebarOpen])

  // O "+" da barra inferior do celular cria a tarefa no dia selecionado.
  useEffect(() => {
    setQuickCreateDueDate(showUndated ? undefined : selectedKey)
    return () => setQuickCreateDueDate(undefined)
  }, [selectedKey, showUndated, setQuickCreateDueDate])

  useEffect(() => { detailRef.current?.scrollTo(0, 0) }, [detailId])
  useLayoutEffect(() => {
    if (!isDesktop) {
      if (detailId) {
        if (!hadDetail.current) returnScroll.current = window.scrollY
        window.scrollTo(0, 0)
      } else if (hadDetail.current) window.scrollTo(0, returnScroll.current)
    }
    hadDetail.current = Boolean(detailId)
  }, [detailId, isDesktop])

  // Atalhos de teclado no estilo do Google Agenda.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      // Com um diálogo, cartão ou sheet aberto, as teclas são dele.
      if (document.querySelector('[role="dialog"]')) return
      const key = event.key.toLowerCase()
      const viewShortcut = VIEWS.find((v) => v.key === key)
      if (viewShortcut) setView(viewShortcut.value)
      else if (key === 't') selectDate(new Date())
      else if (key === 'j' || key === 'n' || event.key === 'ArrowRight') move(1)
      else if (key === 'k' || key === 'p' || event.key === 'ArrowLeft') move(-1)
      else if (key === 'c') openCreate(showUndated ? undefined : selectedKey)
      else if (key === '/') { event.preventDefault(); setSearchOpen(true); requestAnimationFrame(() => searchRef.current?.focus()) }
      else if (event.key === 'Escape' && detailId) navigate(`/calendar${search}`)
      else return
      event.preventDefault()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  // --- Conteúdo principal ---
  function content() {
    if (normalizedQuery) {
      return (
        <section aria-label="Resultados da pesquisa" className="rounded-2xl border border-border-soft bg-base-alt p-3 lg:h-full lg:overflow-y-auto">
          <h3 className="px-2 py-2 text-sm font-semibold text-text">{filtered.length} {filtered.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}</h3>
          <CalendarTaskList tasks={filtered} taskTo={taskTo} empty="Nenhuma tarefa encontrada." />
        </section>
      )
    }
    if (showUndated) {
      return (
        <section aria-label="Tarefas sem data" className="rounded-2xl border border-border-soft bg-base-alt p-3 lg:h-full lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <h3 className="text-sm font-semibold text-text">Tarefas sem data ({undated.length})</h3>
            <button type="button" className="text-sm font-semibold text-accent" onClick={() => updateParams({ undated: null })}>Voltar ao calendário</button>
          </div>
          <CalendarTaskList tasks={undated} taskTo={taskTo} empty="Nenhuma tarefa sem data." onCreate={() => openCreate()} />
        </section>
      )
    }
    const shared = { todayKey, byDay, projectsById, onCreate: (key: string, time?: string) => openCreate(key, time), onOpenDay: (date: Date) => selectDate(date, 'day'), onOpenTask: (task: Task, anchor: HTMLElement) => setQuickView({ task, anchor }) }
    if (view === 'day' && isDesktop) return <TimeGrid days={[cursor]} {...shared} />
    if (view === 'day') return <DayView date={cursor} todayKey={todayKey} tasks={byDay.get(selectedKey) ?? []} taskTo={taskTo} onCreate={() => openCreate(selectedKey)} />
    if (view === 'agenda') return <AgendaView cursor={cursor} todayKey={todayKey} byDay={byDay} taskTo={taskTo} onOpenDay={(date) => selectDate(date, 'day')} />
    if (view === 'week') {
      return isDesktop
        ? <TimeGrid days={weekGrid(cursor)} {...shared} />
        : <MobileWeek cursor={cursor} todayKey={todayKey} byDay={byDay} taskTo={taskTo} onCreate={(key) => openCreate(key)} />
    }
    if (isDesktop) return <MonthView cursor={cursor} {...shared} />
    const dayTasks = byDay.get(selectedKey) ?? []
    return (
      <div className="flex flex-col gap-3">
        <MiniMonth variant="mobile" month={cursor} selectedKey={selectedKey} todayKey={todayKey} byDay={byDay} projectsById={projectsById} onSelect={(date) => selectDate(date)} onMonthChange={move} />
        <section aria-label="Tarefas do dia selecionado" className="rounded-2xl border border-border-soft bg-base-alt p-3">
          <DayHeading date={cursor} todayKey={todayKey} count={dayTasks.length} onCreate={() => openCreate(selectedKey)} size="md" />
          <div className="mt-2 border-t border-border-soft pt-1">
            <CalendarTaskList tasks={dayTasks} taskTo={taskTo} empty="Nenhuma tarefa neste dia." onCreate={() => openCreate(selectedKey)} />
          </div>
        </section>
      </div>
    )
  }

  const filtersProps = {
    projects: filterProjects,
    hiddenProjects,
    onToggleProject: toggleProject,
    showCompleted,
    hideClosedProjects: hideClosed,
    onToggleHideClosedProjects: () => updateParams({ closed: hideClosed ? null : 'hide' }),
    onToggleCompleted: () => updateParams({ completed: showCompleted ? 'false' : null }),
    undatedCount: tasks.filter((task) => !task.dueDate && !hiddenProjects.has(task.projectId ?? 'standalone') && (showCompleted || task.status !== 'done')).length,
    showUndated,
    onToggleUndated: () => updateParams({ undated: showUndated ? null : 'true' }),
    hasActiveFilters: pickedHidden.size > 0 || !showCompleted || hideClosed,
    onClear: () => updateParams({ hide: null, completed: null, closed: null }),
  }

  const viewSwitcher = (
    <div role="radiogroup" aria-label="Visualização do calendário" className="flex gap-1 rounded-full bg-surface p-1">
      {VIEWS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={view === option.value}
          title={`${option.label} (${option.key.toUpperCase()})`}
          onClick={() => setView(option.value)}
          className={cn('h-8 flex-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent lg:flex-none', view === option.value ? 'bg-accent text-white' : 'text-text-muted hover:text-text')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )

  const searchField = (
    <label className="flex h-10 w-full items-center gap-2 rounded-full border border-border bg-surface px-3 text-text-muted focus-within:border-accent lg:w-64">
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">Pesquisar no calendário</span>
      <input
        ref={searchRef}
        type="search"
        autoFocus
        placeholder="Pesquisar tarefas"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Escape') closeSearch() }}
        className="w-full min-w-0 bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
      />
      <button type="button" onClick={closeSearch} aria-label="Fechar pesquisa" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:text-text"><X size={15} /></button>
    </label>
  )

  return (
    <div className="relative flex min-w-0 flex-col lg:h-full lg:overflow-hidden">
      <h1 className="sr-only">Calendário</h1>
      <div className={cn('flex min-w-0 flex-1 flex-col lg:min-h-0', detailId && 'hidden lg:flex')}>
        <header className="sticky top-0 z-20 flex flex-col gap-3 bg-base px-5 pb-3 pt-[calc(env(safe-area-inset-top)+16px)] lg:static">
          {isDesktop ? (
            <div className="flex items-center gap-2">
              <button type="button" className={iconButton} onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'} title={sidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'}>
                {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
              <button type="button" className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent" onClick={() => selectDate(new Date())} title="Hoje (T)">Hoje</button>
              <button type="button" className={iconButton} aria-label="Período anterior" title="Período anterior (K)" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
              <button type="button" className={iconButton} aria-label="Próximo período" title="Próximo período (J)" onClick={() => move(1)}><ChevronRight size={20} /></button>
              <h2 aria-live="polite" className="ml-2 min-w-0 truncate text-xl font-bold text-text">{showUndated ? 'Tarefas sem data' : periodTitle}</h2>
              <div className="ml-auto flex items-center gap-2">
                {searchOpen || query ? searchField : <button type="button" className={iconButton} aria-label="Pesquisar no calendário" title="Pesquisar (/)" onClick={() => setSearchOpen(true)}><Search size={18} /></button>}
                {viewSwitcher}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <h2 aria-live="polite" className="min-w-0 flex-1 truncate text-xl font-bold text-text">{showUndated ? 'Tarefas sem data' : periodTitle}</h2>
                <button type="button" className={iconButton} aria-label="Ir para hoje" title="Hoje" onClick={() => selectDate(new Date())}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-current text-[11px] font-bold leading-none">{new Date().getDate()}</span>
                </button>
                <button type="button" className={cn(iconButton, (searchOpen || query) && 'bg-accent-soft text-accent')} aria-label="Pesquisar no calendário" onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}><Search size={18} /></button>
                <button type="button" className={cn(iconButton, filtersProps.hasActiveFilters && 'text-accent')} aria-label="Filtros do calendário" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} /></button>
              </div>
              {(searchOpen || query) && searchField}
              <div className="flex items-center gap-1">
                <button type="button" className={iconButton} aria-label="Período anterior" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
                <div className="min-w-0 flex-1">{viewSwitcher}</div>
                <button type="button" className={iconButton} aria-label="Próximo período" onClick={() => move(1)}><ChevronRight size={20} /></button>
              </div>
            </>
          )}
        </header>

        <div className="flex min-h-0 flex-1 gap-5 px-5 pb-6 lg:pb-5">
          {sidebarOpen && (
            <aside aria-label="Navegação e filtros do calendário" className="hidden w-60 shrink-0 flex-col gap-5 overflow-y-auto pb-2 lg:flex">
              <Button icon={<Plus size={16} />} onClick={() => openCreate(showUndated ? undefined : selectedKey)} className="self-start" title="Nova tarefa (C)">Nova tarefa</Button>
              <MiniMonth month={miniCursor} selectedKey={selectedKey} todayKey={todayKey} onSelect={(date) => selectDate(date)} onMonthChange={(delta) => setMiniMonth({ anchor: selectedKey, month: shiftMonth(miniCursor, delta) })} />
              <CalendarFilters {...filtersProps} />
            </aside>
          )}
          <main aria-label="Agenda de tarefas" className="min-w-0 flex-1 lg:min-h-0">
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => { markDragEnd(); setDragging(null) }}>
              {content()}
              <DragOverlay dropAnimation={null}>
                {dragging && <ChipBody task={dragging} project={projectsById.get(dragging.projectId ?? '') as Project | undefined} className="w-44 shadow-lg" />}
              </DragOverlay>
            </DndContext>
          </main>
        </div>
      </div>

      {detailId && (
        <div ref={detailRef} data-scroll-pane="calendar-detail" className="w-full min-w-0 lg:absolute lg:inset-y-0 lg:right-0 lg:z-30 lg:w-[440px] lg:overflow-y-auto lg:border-l lg:border-border-soft lg:bg-base lg:shadow-2xl">
          <Outlet />
        </div>
      )}

      {quickView && (
        <TaskQuickView
          task={quickView.task}
          anchor={quickView.anchor}
          onClose={() => setQuickView(null)}
          onOpenDetails={(task) => navigate(taskTo(task))}
          onEdit={(task) => setEditTask(task)}
        />
      )}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros do calendário">
        <CalendarFilters {...filtersProps} onToggleUndated={() => { filtersProps.onToggleUndated(); setFiltersOpen(false) }} />
      </Sheet>
      <TaskFormSheet open={create.open} onClose={() => setCreate({ open: false })} defaultDueDate={create.date} defaultDueTime={create.time} />
      <TaskFormSheet open={Boolean(editTask)} onClose={() => setEditTask(null)} task={editTask ?? undefined} />
    </div>
  )
}
