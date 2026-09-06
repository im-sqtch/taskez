import { ArrowLeft, Bell, LogOut, Moon, Sun, Trash2, User, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Field } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import { isPushSubscribed, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-5">
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-text-faint">{title}</p>
      <div className="flex flex-col overflow-hidden rounded-xl bg-surface">{children}</div>
    </div>
  )
}

function Row({
  icon,
  label,
  onClick,
  danger,
  trailing,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  danger?: boolean
  trailing?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 border-b border-border-soft px-4 py-3.5 text-left last:border-b-0"
    >
      <span className={danger ? 'text-danger' : 'text-text-muted'}>{icon}</span>
      <span className={cn('flex-1 text-sm font-medium', danger ? 'text-danger' : 'text-text')}>{label}</span>
      {trailing}
    </button>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.currentUser())
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifBusy, setNotifBusy] = useState(false)

  useEffect(() => {
    isPushSubscribed().then(setNotifEnabled)
  }, [])

  if (!user) return null

  async function handleToggleNotifications() {
    if (notifBusy) return
    setNotifBusy(true)
    try {
      if (notifEnabled) {
        await unsubscribeFromPush()
        setNotifEnabled(false)
      } else {
        const result = await subscribeToPush(user.id)
        if (result.ok) {
          setNotifEnabled(true)
        } else {
          alert(result.error)
        }
      }
    } finally {
      setNotifBusy(false)
    }
  }

  function handleLogout() {
    if (confirm('Deseja sair da sua conta?')) {
      logout()
      navigate('/login')
    }
  }

  function handleDeleteAccount() {
    if (confirm('Esta ação é permanente. Excluir sua conta e todos os dados?')) {
      deleteAccount()
      navigate('/login')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <ArrowLeft size={19} />
        </button>
        <h1 className="text-2xl font-bold text-text">Configurações</h1>
      </header>

      <button
        onClick={() => setEditOpen(true)}
        className="mx-5 flex items-center gap-3.5 rounded-xl bg-surface p-4 text-left"
      >
        <Avatar name={user.name} color={user.avatarColor} size="md" />
        <div className="flex-1">
          <p className="font-semibold text-text">{user.name}</p>
          <p className="text-xs text-text-faint">{user.email}</p>
        </div>
        <span className="text-xs font-semibold text-accent">Editar</span>
      </button>

      <Section title="Aparência">
        <div className="flex items-center gap-3 px-4 py-3.5">
          {theme === 'dark' ? <Moon size={17} className="text-text-muted" /> : <Sun size={17} className="text-text-muted" />}
          <span className="flex-1 text-sm font-medium text-text">Tema</span>
          <div className="flex gap-1 rounded-full bg-surface-alt p-1">
            <button
              onClick={() => setTheme('dark')}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold', theme === 'dark' ? 'bg-accent text-white' : 'text-text-muted')}
            >
              Escuro
            </button>
            <button
              onClick={() => setTheme('light')}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold', theme === 'light' ? 'bg-accent text-white' : 'text-text-muted')}
            >
              Claro
            </button>
          </div>
        </div>
      </Section>

      <Section title="Notificações">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Bell size={17} className="text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">Notificações push</p>
            {!isPushSupported() && <p className="text-xs text-text-faint">Não suportado neste navegador.</p>}
          </div>
          <Switch
            checked={notifEnabled}
            onChange={handleToggleNotifications}
            disabled={notifBusy || !isPushSupported()}
            aria-label="Notificações push"
          />
        </div>
      </Section>

      <Section title="Workspace">
        <Row icon={<Users size={17} />} label="Gerenciar workspaces" onClick={() => alert('Em breve: múltiplos workspaces.')} />
        <Row icon={<User size={17} />} label="Modo de uso" onClick={() => navigate('/usage-picker')} />
      </Section>

      <Section title="Conta">
        <Row icon={<LogOut size={17} />} label="Sair" onClick={handleLogout} />
        <Row icon={<Trash2 size={17} />} label="Excluir conta" onClick={handleDeleteAccount} danger />
      </Section>

      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar perfil"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              if (name.trim()) updateProfile({ name: name.trim() })
              setEditOpen(false)
            }}
          >
            Salvar
          </Button>
        }
      >
        <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Sheet>
    </div>
  )
}
