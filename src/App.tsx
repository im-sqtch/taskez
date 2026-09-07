import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { UsagePickerPage } from '@/pages/auth/UsagePickerPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { TaskDetailPage } from '@/pages/tasks/TaskDetailPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

function RootRedirect() {
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding)
  const currentUserId = useAuthStore((s) => s.currentUserId)

  if (!hasSeenOnboarding) return <Navigate to="/onboarding" replace />
  if (!currentUserId) return <Navigate to="/login" replace />
  return <Navigate to="/dashboard" replace />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const currentUserId = useAuthStore((s) => s.currentUserId)
  if (!currentUserId) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Só avalia o estado de autenticação na montagem: como login/cadastro navegam
// para fora desta rota após alterar o estado, reavaliar a cada render criaria uma
// corrida entre a atualização do Zustand e a navegação, jogando o usuário de volta
// para o dashboard no meio da própria transição pós-cadastro.
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const [wasAuthedOnMount] = useState(() => Boolean(useAuthStore.getState().currentUserId))
  if (wasAuthedOnMount) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const theme = useThemeStore((s) => s.theme)
  const authReady = useAuthStore((s) => s.authReady)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Aguarda a sessão do Supabase ser restaurada (assíncrono) antes de decidir para
  // onde navegar — sem isso, um usuário já logado piscaria a tela de login por um
  // instante a cada recarregamento da página. Também aguarda a reidratação do
  // localStorage (hasSeenOnboarding): ela é assíncrona, então sem esperar por ela
  // o app manda o usuário de volta pro onboarding a cada abertura, mesmo já tendo
  // pulado antes.
  if (!authReady || !hasHydrated) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <SignupPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/usage-picker"
          element={
            <RequireAuth>
              <UsagePickerPage />
            </RequireAuth>
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
