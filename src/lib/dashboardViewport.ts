import { useSyncExternalStore } from 'react'

export type DashboardViewport = 'mobile' | 'desktop'

const DESKTOP_QUERY = '(min-width: 1024px)'

export function getDashboardViewport(): DashboardViewport {
  if (typeof window === 'undefined') return 'mobile'
  return window.matchMedia(DESKTOP_QUERY).matches ? 'desktop' : 'mobile'
}

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

export function useDashboardViewport(): DashboardViewport {
  return useSyncExternalStore(subscribe, getDashboardViewport, () => 'mobile')
}
