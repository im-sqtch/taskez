import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { NotificationsPanel } from '@/components/layout/NotificationsPanel'
import { QuickCreateSheet } from '@/components/layout/QuickCreateSheet'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabBar } from '@/components/layout/TabBar'
import { NotificationsSheet } from '@/components/layout/NotificationsSheet'
import { SearchOverlay } from '@/components/layout/SearchOverlay'
import { useDataStore } from '@/store/dataStore'
import { useUiStore } from '@/store/uiStore'

export function AppShell() {
  const checkDueRecurrences = useDataStore((s) => s.checkDueRecurrences)
  const desktopNotificationsOpen = useUiStore((s) => s.desktopNotificationsOpen)

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

  return (
    <div className="flex w-full flex-1 bg-base">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {desktopNotificationsOpen && (
        <div className="hidden lg:flex">
          <NotificationsPanel />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-none">
        <div className="flex-1 pb-28 lg:mx-auto lg:w-full lg:max-w-6xl lg:pb-8">
          <Outlet />
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
