import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { QuickCreateSheet } from '@/components/layout/QuickCreateSheet'
import { TabBar } from '@/components/layout/TabBar'
import { NotificationsSheet } from '@/components/layout/NotificationsSheet'
import { SearchOverlay } from '@/components/layout/SearchOverlay'
import { useDataStore } from '@/store/dataStore'

export function AppShell() {
  const checkDueRecurrences = useDataStore((s) => s.checkDueRecurrences)

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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col bg-base">
      <div className="flex-1 pb-28">
        <Outlet />
      </div>
      <TabBar />
      <QuickCreateSheet />
      <NotificationsSheet />
      <SearchOverlay />
    </div>
  )
}
