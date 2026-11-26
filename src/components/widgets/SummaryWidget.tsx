import { CheckCircle2, ChevronLeft, ChevronRight, Flame, Target } from 'lucide-react'
import { useRef, useState, type TouchEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { computeStats, weeklyHistory } from '@/lib/stats'
import { widgetContentSize } from '@/lib/widgetCatalog'
import { useWorkspaceTasks } from '@/store/dataStore'
import type { WidgetSize } from '@/types'

function StatPill({ icon, value, label, compact }: { icon: React.ReactNode; value: number | string; label: string; compact: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center rounded-xl bg-white/10 px-2 text-center', compact ? 'gap-1 py-2' : 'gap-1 py-3')}>
      <div className={cn('flex items-center gap-1.5 text-white', !compact && 'flex-col gap-1')}>
        {icon}
        <p className={cn('font-bold leading-tight text-white', compact ? 'text-base' : 'text-lg')}>{value}</p>
      </div>
      <p className="text-[11px] leading-tight text-white/70">{label}</p>
    </div>
  )
}

export function SummaryWidget({ size }: { size: WidgetSize }) {
  const content = widgetContentSize(size)
  const compact = content !== 'L'
  const tasks = useWorkspaceTasks()
  const stats = computeStats(tasks)
  const history = weeklyHistory(tasks)
  const maxCount = Math.max(1, ...history.map((d) => d.count))
  const [page, setPage] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const perPage = content === 'S' ? 1 : content === 'M' ? 2 : 4
  const pageCount = 4 / perPage
  const currentPage = page % pageCount

  function navigate(direction: number) {
    setPage((previous) => (previous % pageCount + direction + pageCount) % pageCount)
  }

  function finishSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current
    touchStart.current = null
    const end = event.changedTouches[0]
    if (!start || !end) return
    const dx = end.clientX - start.x
    const dy = end.clientY - start.y
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) navigate(dx < 0 ? 1 : -1)
  }

  const blocks = [
    <div key="progress" className={cn('flex flex-col justify-center', compact ? 'gap-2' : 'gap-3')} role="group" aria-label="Porcentagem de conclusão">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className={cn('font-extrabold text-white', compact ? 'text-2xl' : 'text-4xl')}>{stats.weekProgress}%</p>
        <p className="pb-1 text-xs font-medium text-white/70">das tarefas da semana concluídas</p>
      </div>
      <ProgressBar value={stats.weekProgress} color="white" trackClassName="bg-white/20" />
    </div>,
    <div key="totals" className="flex items-center gap-3" role="group" aria-label="Totais, em andamento e consecutivos">
      <StatPill compact={compact} icon={<CheckCircle2 size={16} />} value={`${stats.completedTotal}`} label={`de ${stats.totalTasks} totais`} />
      <StatPill compact={compact} icon={<Target size={16} />} value={stats.inProgress} label="em andamento" />
      <StatPill compact={compact} icon={<Flame size={16} />} value={`${stats.streak}d`} label="consecutivos" />
    </div>,
    <div key="pending" className={cn('flex flex-col justify-center gap-1.5 rounded-xl bg-white/10 px-3.5', compact ? 'py-2' : 'py-3')} role="group" aria-label="Pendências da semana">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/80">Pendências da semana</p>
        <p className="text-sm font-bold text-white">{stats.pendingThisWeek}</p>
      </div>
      <p className="text-[11px] text-white/70">{stats.overdueThisWeek} atrasadas · {stats.pendingThisWeek - stats.overdueThisWeek} dentro do prazo</p>
    </div>,
    <div key="history" className={cn('flex flex-col justify-center', compact ? 'gap-1' : 'gap-2')} role="group" aria-label="Histórico de conclusão">
      <p className="text-xs font-semibold text-white/80">Histórico de Conclusão</p>
      <div className="flex items-end justify-between gap-1.5 px-1">
        {history.map((day, i) => (
          <div key={i} className={cn('flex flex-1 flex-col items-center', compact ? 'gap-1' : 'gap-1.5')}>
            <div className={cn('flex w-full items-end', compact ? 'h-6' : 'h-12')}>
              <div
                className={cn('w-full rounded-md bg-white/25', day.isToday && 'bg-white')}
                style={{ height: `${Math.max(10, (day.count / maxCount) * 100)}%` }}
                role="img"
                aria-label={`${day.label}: ${day.count} conclusões`}
              />
            </div>
            <span className={cn('text-[11px] font-medium text-white/60', day.isToday && 'text-white font-bold')}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>,
  ]

  return (
    <Card elevated role="region" aria-label="Progresso da semana" className={cn('relative overflow-hidden bg-gradient-to-br from-accent to-[#5A3FD6] border-none text-white lg:h-full', compact && 'p-3!')}>
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className={cn('relative flex flex-col', compact ? 'gap-2' : 'gap-4')}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white/80">Progresso da semana</p>
          {pageCount > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => navigate(-1)} aria-label="Dados anteriores" className="hidden h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white lg:flex">
                <ChevronLeft size={18} />
              </button>
              <p className="text-[11px] tabular-nums text-white/70" role="status" aria-live="polite">
                {currentPage + 1} de {pageCount}
              </p>
              <button type="button" onClick={() => navigate(1)} aria-label="Próximos dados" className="hidden h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white lg:flex">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
        {pageCount === 1 ? (
          <div className="flex flex-col gap-4">{blocks}</div>
        ) : (
          <>
            <div
              className="touch-pan-y overflow-hidden"
              onTouchStart={(event) => {
                const touch = event.touches[0]
                touchStart.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null
              }}
              onTouchEnd={finishSwipe}
              onTouchCancel={() => { touchStart.current = null }}
            >
              <div className="flex transition-transform duration-250 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${currentPage * 100}%)` }}>
                {Array.from({ length: pageCount }, (_, index) => (
                  <div
                    key={index}
                    className={cn('grid w-full shrink-0 gap-2', perPage === 1 ? 'min-h-18 grid-rows-1' : 'min-h-36 grid-rows-2')}
                    aria-hidden={index !== currentPage}
                    inert={index !== currentPage}
                  >
                    {blocks.slice(index * perPage, (index + 1) * perPage)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
