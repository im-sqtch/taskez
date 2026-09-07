import { Outlet } from 'react-router-dom'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { QuickCreateSheet } from '@/components/layout/QuickCreateSheet'
import { TabBar } from '@/components/layout/TabBar'
import { NotificationsSheet } from '@/components/layout/NotificationsSheet'
import { SearchOverlay } from '@/components/layout/SearchOverlay'

export function AppShell() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col bg-base">
      <div className="flex-1 pb-28">
        <Outlet />
      </div>
      <TabBar />
      <QuickCreateSheet />
      <NotificationsSheet />
      <SearchOverlay />
      <ConfirmDialog />
    </div>
  )
}
