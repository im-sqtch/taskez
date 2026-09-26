import { useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getStartupScreen } from '@/lib/lastScreen'
import { useAuthStore } from '@/store/authStore'

// Montado apenas depois de a autenticação ser restaurada. Impede que a tela
// de entrada apareça ou sobrescreva o localStorage antes do redirecionamento.
export function RestoreLastScreen({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [startup] = useState(() => ({
    key: location.key,
    target: getStartupScreen(
      useAuthStore.getState().currentUserId,
      location.pathname + location.search + location.hash,
    ),
  }))
  const currentPath = location.pathname + location.search + location.hash

  if (location.key === startup.key && currentPath !== startup.target) {
    return <Navigate to={startup.target} replace />
  }

  return children
}
