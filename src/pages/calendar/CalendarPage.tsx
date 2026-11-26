import { CalendarDays, Check, ChevronLeft, ChevronRight, ListTodo, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { TaskFormSheet } from '@/components/tasks/TaskFormSheet'
import { TaskRow } from '@/components/tasks/TaskRow'
import { WEEKDAY_LABELS, addDays, addMonths, dateKey, dueDateKey, formatFullDate, formatMonthTitle, formatWeekTitle, keyToDate, monthGrid, weekGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { useCurrentWorkspace, useWorkspaceProjects, useWorkspaceTasks } from '@/store/dataStore'
import type { Task } from '@/types'

type CalendarView = 'day' | 'week' | 'month' | 'agenda'
const views: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Dia' }, { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' }, { value: 'agenda', label: 'Agenda' },
]
const control = 'flex h-11 min-w-11 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:bg-accent-soft'

function validDate(key: string | null): key is string {
  return Boolean(key && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(keyToDate(key)) === key)
}

export function CalendarPage() {
  const tasks = useWorkspaceTasks()
  const projects = useWorkspaceProjects()
  const workspace = useCurrentWorkspace()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const detail = useMatch('/calendar/:id')
  const detailId = detail?.params.id
  const detailRef = useRef<HTMLDivElement>(null)
  const returnScroll = useRef(0)
  const hadDetail = useRef(false)
  const requestedView = params.get('view')
  const view: CalendarView = views.some((v) => v.value === requestedView) ? requestedView as CalendarView : 'month'
  const selectedKey = validDate(params.get('date')) ? params.get('date')! : dateKey(new Date())
  const cursor = keyToDate(selectedKey)
  const [miniNavigation, setMiniNavigation] = useState({ anchor: selectedKey, cursor })
  const miniCursor = miniNavigation.anchor === selectedKey ? miniNavigation.cursor : cursor
  const setMiniCursor = (date: Date) => setMiniNavigation({ anchor: selectedKey, cursor: date })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const hiddenProjects = new Set(params.getAll('hide'))
  const showCompleted = params.get('completed') !== 'false'
  const showUndated = params.get('undated') === 'true'
  const [createDate, setCreateDate] = useState<string | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const todayKey = dateKey(new Date())

  useEffect(() => { detailRef.current?.scrollTo(0, 0) }, [detailId])
  useLayoutEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      if (detailId) {
        if (!hadDetail.current) returnScroll.current = window.scrollY
        window.scrollTo(0, 0)
      } else if (hadDetail.current) window.scrollTo(0, returnScroll.current)
    }
    hadDetail.current = Boolean(detailId)
  }, [detailId])

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
    selectDate(view === 'month' || view === 'agenda' ? addMonths(cursor, delta) : addDays(cursor, delta * (view === 'week' ? 7 : 1)))
  }
  function create(date?: string) { setCreateDate(date); setCreateOpen(true) }
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

  const filtered = tasks.filter((task) => !hiddenProjects.has(task.projectId ?? 'standalone')
    && (showCompleted || task.status !== 'done')
    && (!query.trim() || `${task.title} ${task.description ?? ''} ${projects.find((p) => p.id === task.projectId)?.name ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))))
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of filtered) {
      if (!task.dueDate) continue
      const key = dueDateKey(task.dueDate)
      map.set(key, [...(map.get(key) ?? []), task])
    }
    for (const list of map.values()) list.sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.order - b.order)
    return map
  }, [filtered])
  const undated = filtered.filter((t) => !t.dueDate)
  const days = view === 'month' ? monthGrid(cursor) : view === 'week' ? weekGrid(cursor) : [cursor]
  const agendaDays = Array.from({ length: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)).filter((day) => byDay.has(dateKey(day)))
  const periodTitle = view === 'day' ? formatFullDate(cursor) : view === 'week' ? formatWeekTitle(days) : formatMonthTitle(cursor)
  const search = params.toString() ? `?${params}` : ''
  const taskTo = (task: Task) => `/calendar/${task.id}${search}`

  function event(task: Task) {
    const project = projects.find((p) => p.id === task.projectId)
    return (
      <Link key={task.id} to={taskTo(task)} title={task.title}
        className={cn('calendar-event', task.status === 'done' && 'calendar-event-done')}
        style={{ borderInlineStartColor: project?.color ?? 'var(--color-accent)' }}>
        {task.status === 'done' && <Check size={12} className="shrink-0" aria-hidden="true" />}
        <span className="truncate">{task.title}</span>
      </Link>
    )
  }

  function taskList(list: Task[], empty = 'Nenhuma tarefa neste dia.') {
    return list.length ? list.map((task) => <TaskRow key={task.id} task={task} to={taskTo(task)} />) : (
      <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-text-muted">
        <CalendarDays size={26} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm">{empty}</p>
        <button className="min-h-11 text-sm font-semibold text-accent" onClick={() => create(showUndated ? undefined : selectedKey)}>Criar tarefa</button>
      </div>
    )
  }

  return (
    <div className="calendar-page">
      <div className={cn('calendar-main', detail && 'hidden lg:flex')}>
        <header className="calendar-header">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-text-muted">{workspace?.name}</p>
              <h1 className="text-xl font-bold text-text">Calendário</h1>
            </div>
            <div className="flex items-center gap-1">
              <button className={cn(control, filtersOpen && 'bg-accent-soft text-accent')} aria-label="Filtros do calendário" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={19} /></button>
              <button className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white active:opacity-80" onClick={() => create(showUndated ? undefined : selectedKey)}><Plus size={18} aria-hidden="true" /><span>Nova tarefa</span></button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button className="h-11 rounded-xl border border-border px-3 text-sm font-semibold text-text hover:bg-surface" onClick={() => selectDate(new Date())}>Hoje</button>
              <button className={control} aria-label="Período anterior" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
              <button className={control} aria-label="Próximo período" onClick={() => move(1)}><ChevronRight size={20} /></button>
            </div>
            <label className="sr-only" htmlFor="calendar-view">Visualização do calendário</label>
            <select id="calendar-view" value={view} onChange={(e) => updateParams({ view: e.target.value, undated: null })} className="h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text focus-visible:outline-accent">
              {views.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <h2 aria-live="polite" className="text-base font-semibold text-text">{showUndated ? 'Tarefas sem data' : periodTitle}</h2>
            <label className="calendar-date-label"><span className="sr-only">Ir para uma data</span><input aria-label="Ir para uma data" type="date" value={selectedKey} onChange={(e) => { if (validDate(e.target.value)) selectDate(keyToDate(e.target.value)) }} /></label>
          </div>
          <label className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-border-soft bg-surface px-3 text-text-muted"><Search size={17} aria-hidden="true" /><span className="sr-only">Pesquisar no calendário</span><input type="search" placeholder="Pesquisar tarefas" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full min-w-0 bg-transparent text-sm text-text outline-none" /></label>
        </header>

        <div className="calendar-body">
          <aside className={cn('calendar-filters', filtersOpen ? 'block' : 'hidden xl:block')} aria-label="Filtros e navegação do calendário">
            <div className="hidden xl:block">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">{formatMonthTitle(miniCursor)}</p><button className={control} aria-label="Mês anterior no minicalendário" onClick={() => setMiniCursor(addMonths(miniCursor, -1))}><ChevronLeft size={16} /></button><button className={control} aria-label="Próximo mês no minicalendário" onClick={() => setMiniCursor(addMonths(miniCursor, 1))}><ChevronRight size={16} /></button></div>
              <div className="grid grid-cols-7 text-center text-xs">
                {WEEKDAY_LABELS.map((label) => <span key={label} className="py-2 text-text-muted">{label[0]}</span>)}
                {monthGrid(miniCursor).map((date) => <button key={dateKey(date)} aria-label={formatFullDate(date)} aria-pressed={dateKey(date) === selectedKey} onClick={() => selectDate(date)} className={cn('h-8 rounded-full hover:bg-accent-soft focus-visible:outline-accent', date.getMonth() !== miniCursor.getMonth() && 'text-text-faint', dateKey(date) === todayKey && 'font-bold text-accent', dateKey(date) === selectedKey && 'bg-accent-soft font-bold text-accent')}>{date.getDate()}</button>)}
              </div>
            </div>
            <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-text-muted">Meus projetos</h3>
            {[...projects.map((p) => ({ id: p.id, name: p.name, color: p.color })), { id: 'standalone', name: 'Tarefas avulsas', color: 'var(--color-accent)' }].map((project) => (
              <label key={project.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={!hiddenProjects.has(project.id)} onChange={() => toggleProject(project.id)} className="h-4 w-4 shrink-0" style={{ accentColor: project.color }} /><span className="min-w-0 break-words">{project.name}</span></label>
            ))}
            <div className="mt-2 border-t border-border-soft pt-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input className="h-4 w-4 accent-accent" type="checkbox" checked={showCompleted} onChange={() => updateParams({ completed: showCompleted ? 'false' : null })} />Mostrar concluídas</label>
              <button className="min-h-11 text-left text-sm font-semibold text-accent" onClick={() => { setQuery(''); updateParams({ hide: null, completed: null }) }}>Limpar filtros</button>
            </div>
          </aside>

          <main className="min-w-0 flex-1" aria-label="Agenda de tarefas">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
              <span>Prazos de dia inteiro</span>
              <button className={cn('flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm hover:bg-surface', showUndated && 'bg-accent-soft text-accent')} onClick={() => updateParams({ undated: showUndated ? null : 'true' })}><ListTodo size={16} aria-hidden="true" />{showUndated ? 'Voltar ao calendário' : `Sem data (${undated.length})`}</button>
            </div>

            {query.trim() ? <section aria-label="Resultados da pesquisa" className="rounded-2xl border border-border-soft bg-base-alt p-3"><h3 className="px-2 py-3 text-sm font-semibold">{filtered.length} {filtered.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}</h3>{taskList(filtered, 'Nenhuma tarefa encontrada.')}</section> : showUndated ? <section aria-label="Tarefas sem data" className="rounded-2xl border border-border-soft bg-base-alt p-2">{taskList(undated, 'Nenhuma tarefa sem data.')}</section> : view === 'day' ? (
              <section className="rounded-2xl border border-border-soft bg-base-alt p-3" aria-label={formatFullDate(cursor)}>
                <div className="mb-3 flex items-center justify-between border-b border-border-soft pb-3"><span className="text-sm text-text-muted">{(byDay.get(selectedKey) ?? []).length} tarefas</span><button className={control} aria-label="Criar tarefa neste dia" onClick={() => create(selectedKey)}><Plus size={20} /></button></div>
                {taskList(byDay.get(selectedKey) ?? [])}
              </section>
            ) : view === 'agenda' ? (
              <section className="flex flex-col gap-3" aria-label="Agenda do mês">
                {agendaDays.length ? agendaDays.map((date) => <div key={dateKey(date)} className="rounded-2xl border border-border-soft bg-base-alt p-3"><button onClick={() => selectDate(date, 'day')} className="min-h-11 text-left text-sm font-bold text-text">{formatFullDate(date)}</button>{taskList(byDay.get(dateKey(date)) ?? [])}</div>) : taskList([], 'Nenhuma tarefa neste mês com os filtros atuais.')}
              </section>
            ) : (
              <>
                <div className={cn('calendar-grid', view === 'week' && 'calendar-week')}>
                  {WEEKDAY_LABELS.map((label) => <div key={label} className="calendar-weekday">{label}</div>)}
                  {days.map((date) => {
                    const key = dateKey(date)
                    const list = byDay.get(key) ?? []
                    return <div key={key} data-calendar-day={key} className={cn('calendar-cell', view === 'month' && date.getMonth() !== cursor.getMonth() && 'calendar-outside', key === selectedKey && 'calendar-selected')}>
                      <button aria-label={`Ver ${formatFullDate(date)}`} className={cn('calendar-day-number', key === todayKey && 'calendar-today')} onClick={() => selectDate(date, 'day')}>{date.getDate()}</button>
                      <div className="flex min-w-0 flex-col gap-1">{list.slice(0, view === 'week' ? 12 : 2).map(event)}</div>
                      {list.length > (view === 'week' ? 12 : 2) && <button className="calendar-more" onClick={() => selectDate(date, 'day')}>+{list.length - (view === 'week' ? 12 : 2)}<span className="hidden lg:inline"> mais</span></button>}
                      <button className="calendar-add" aria-label={`Criar tarefa em ${formatFullDate(date)}`} onClick={() => create(key)}><Plus size={14} /></button>
                    </div>
                  })}
                </div>
                <section className="mt-5 rounded-2xl border border-border-soft bg-base-alt p-3" aria-label="Tarefas do dia selecionado">
                  <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-text">{formatFullDate(cursor)}</h3><button className={control} aria-label="Adicionar tarefa ao dia selecionado" onClick={() => create(selectedKey)}><Plus size={19} /></button></div>
                  {taskList(byDay.get(selectedKey) ?? [])}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
      {detail && <div ref={detailRef} className="calendar-detail" data-scroll-pane="calendar-detail"><Outlet /></div>}
      <TaskFormSheet open={createOpen} onClose={() => setCreateOpen(false)} defaultDueDate={createDate} />
      {detail && <button className="sr-only" onClick={() => navigate(`/calendar${search}`)}>Fechar detalhes do calendário</button>}
    </div>
  )
}
