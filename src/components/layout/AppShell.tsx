import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { NotificationsPanel } from '@/components/layout/NotificationsPanel'
import { QuickCreateSheet } from '@/components/layout/QuickCreateSheet'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabBar } from '@/components/layout/TabBar'
import { NotificationsSheet } from '@/components/layout/NotificationsSheet'
import { SearchOverlay } from '@/components/layout/SearchOverlay'
import { useDataStore } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { saveLastScreen } from '@/lib/lastScreen'

type TabSlide = { direction: number; isMobile: boolean }

const tabSlideVariants = {
  enter: ({ direction, isMobile }: TabSlide) => ({
    x: isMobile ? (direction > 0 ? '100%' : '-100%') : 0,
    y: isMobile ? 0 : direction > 0 ? '100%' : '-100%',
  }),
  center: { x: 0, y: 0 },
  exit: ({ direction, isMobile }: TabSlide) => ({
    x: isMobile ? (direction > 0 ? '-100%' : '100%') : 0,
    y: isMobile ? 0 : direction > 0 ? '-100%' : '100%',
    transition: isMobile
      ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }
      : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
    position: 'absolute' as const,
    inset: 0,
    width: '100%',
  }),
}

function tabIndexForPath(pathname: string, isMobile: boolean) {
  if (isMobile) {
    if (pathname.startsWith('/projects') || pathname.startsWith('/files')) return 1
    if (pathname.startsWith('/tasks')) return 2
    if (pathname.startsWith('/profile') || pathname.startsWith('/settings') || pathname.startsWith('/trash')) return 3
    return 0
  }

  if (pathname.startsWith('/projects')) return 1
  if (pathname.startsWith('/tasks')) return 2
  if (pathname.startsWith('/files')) return 3
  if (pathname.startsWith('/profile')) return 4
  if (pathname.startsWith('/settings')) return 5
  if (pathname.startsWith('/trash')) return 6
  return 0
}

export function AppShell() {
  const checkDueRecurrences = useDataStore((s) => s.checkDueRecurrences)
  const seedIfEmpty = useDataStore((s) => s.seedIfEmpty)
  const loading = useDataStore((s) => s.loading)
  const hasWorkspace = useDataStore((s) => s.workspaces.length > 0)
  const desktopNotificationsOpen = useUiStore((s) => s.desktopNotificationsOpen)
  const location = useLocation()
  // `useOutlet()` devolve o elemento da rota deste render. Guardado como filho
  // do painel com key, ele não troca pelo conteúdo novo enquanto o painel antigo
  // está saindo (o antigo <Outlet /> causava o flash antes do slide).
  const outlet = useOutlet()
  const currentUserId = useAuthStore((s) => s.currentUserId)

  useEffect(() => {
    if (currentUserId) {
      saveLastScreen(currentUserId, location.pathname + location.search + location.hash)
    }
  }, [currentUserId, location.pathname, location.search, location.hash])

  // Toda rota autenticada depende dos dados da workspace. Antes, essa carga
  // acontecia apenas no DashboardPage; restaurar diretamente Projetos, Tarefas
  // ou Arquivos deixava a sidebar sem nome e a página sem conteúdo.
  useEffect(() => {
    void seedIfEmpty()
  }, [seedIfEmpty])

  const [isMobile, setIsMobile] = useState(() => !window.matchMedia('(min-width: 1024px)').matches)
  const currentTabIndex = tabIndexForPath(location.pathname, isMobile)
  const [tabTransition, setTabTransition] = useState({ index: currentTabIndex, direction: 1 })
  const slide = { direction: tabTransition.direction, isMobile }

  if (tabTransition.index !== currentTabIndex) {
    setTabTransition({
      index: currentTabIndex,
      direction: currentTabIndex > tabTransition.index ? 1 : -1,
    })
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsMobile(!mediaQuery.matches)
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  // Fica montado durante toda a sessão (trocar de aba só troca a rota dentro
  // do Outlet), então é o lugar certo para reavaliar recorrências quando o
  // usuário volta a olhar o app — cobre o caso de deixar o app aberto em
  // segundo plano passando da meia-noite, sem depender de reabrir do zero.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkDueRecurrences()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onVisibilityChange)
    }
  }, [checkDueRecurrences])

  if (loading || !hasWorkspace) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-base" role="status" aria-label="Carregando workspace">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-1 overflow-x-clip bg-base">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <AnimatePresence>
        {desktopNotificationsOpen && (
          <motion.div
            key="notifications-panel"
            className="hidden lg:flex"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 42, mass: 0.8 }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              initial={{ x: -40 }}
              animate={{ x: 0 }}
              exit={{ x: -40 }}
              transition={{ type: 'spring', stiffness: 420, damping: 42, mass: 0.8 }}
              className="w-[360px] shrink-0"
            >
              <NotificationsPanel />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col overflow-x-clip lg:max-w-none">
        <div className="relative min-w-0 flex-1 overflow-clip pb-28 lg:mx-auto lg:w-full lg:max-w-6xl lg:pb-8">
          <AnimatePresence initial={false} custom={slide} mode="sync">
            <motion.div
              key={currentTabIndex}
              custom={slide}
              variants={tabSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full will-change-transform"
              data-screen-panel
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="lg:hidden">
          <TabBar />
        </div>
      </div>

      <QuickCreateSheet />
      <NotificationsSheet />
      <SearchOverlay />
    </div>
  )
}
