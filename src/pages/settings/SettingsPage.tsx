import { ArrowLeft, Bell, Check, ChevronRight, Globe, LogOut, Monitor, Moon, SlidersHorizontal, Sun, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Field } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { NotificationPrefsSheet } from '@/components/settings/NotificationPrefsSheet'
import { cn } from '@/lib/utils'
import { isPushSubscribed, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { NOTIFICATION_EVENT_KEYS, NOTIFICATION_EVENTS } from '@/lib/notificationCatalog'
import { UTC_OFFSETS, formatUtcOffset } from '@/lib/timezone'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'
import { useNotificationPrefsStore } from '@/store/notificationPrefsStore'
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

// Linha de opção com descrição e marca de selecionado — usada em preferências
// onde o rótulo sozinho (como em `Row`) não basta para explicar a escolha.
function OptionRow({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 border-b border-border-soft px-4 py-3.5 text-left last:border-b-0"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-0.5 text-xs text-text-faint">{description}</p>
      </div>
      {selected && <Check size={16} className="mt-0.5 shrink-0 text-accent" />}
    </button>
  )
}

// Lista fixa de offsets (UTC-12 a UTC+12). Se o valor salvo do usuário não
// estiver nessa lista (ex.: conta antiga com fuso IANA), ele entra como opção
// extra para não sumir do select até o usuário escolher um novo.
const TIMEZONE_OPTIONS = UTC_OFFSETS.map(formatUtcOffset)

function listTimezones(current: string): string[] {
  return TIMEZONE_OPTIONS.includes(current) ? TIMEZONE_OPTIONS : [current, ...TIMEZONE_OPTIONS]
}

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.currentUser())
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const signOutOtherDevices = useAuthStore((s) => s.signOutOtherDevices)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const disabledEvents = useNotificationPrefsStore((s) => s.disabled)

  const [editOpen, setEditOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [tzSheetOpen, setTzSheetOpen] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifBusy, setNotifBusy] = useState(false)

  const activeEvents = NOTIFICATION_EVENT_KEYS.filter(
    (event) => NOTIFICATION_EVENTS[event].alwaysOn || !disabledEvents[event],
  ).length

  useEffect(() => {
    isPushSubscribed().then(setNotifEnabled)
  }, [])

  if (!user) return null

  // Aviso informativo (sem decisão a tomar) no lugar do `alert()` nativo do
  // navegador, que destoa do visual do app.
  function notify(title: string, description: string) {
    confirmAction({ title, description, hideCancel: true, onConfirm: () => {} })
  }

  async function handleToggleNotifications() {
    if (notifBusy || !user) return
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
          notify('Não foi possível ativar', result.error)
        }
      }
    } finally {
      setNotifBusy(false)
    }
  }

  function handleLogout() {
    confirmAction({
      title: 'Sair da conta',
      description: 'Deseja sair da sua conta?',
      confirmLabel: 'Sair',
      onConfirm: () => {
        logout()
        navigate('/login')
      },
    })
  }

  function handleSignOutOtherDevices() {
    confirmAction({
      title: 'Desconectar de outros dispositivos',
      description: 'Isso encerra a sessão em qualquer outro celular, tablet ou navegador logado nesta conta. Este dispositivo continua conectado.',
      confirmLabel: 'Desconectar',
      danger: true,
      onConfirm: async () => {
        const result = await signOutOtherDevices()
        notify(result.ok ? 'Pronto' : 'Não foi possível desconectar', result.ok ? 'Sessão encerrada nos outros dispositivos.' : result.error)
      },
    })
  }

  function handleDeleteAccount() {
    confirmAction({
      title: 'Excluir conta',
      description: 'Esta ação é permanente. Excluir sua conta e todos os dados?',
      confirmLabel: 'Excluir conta',
      danger: true,
      onConfirm: () => {
        deleteAccount()
        navigate('/login')
      },
    })
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

      <Section title="Fuso horário">
        <Row
          icon={<Globe size={17} />}
          label="Fuso horário"
          onClick={() => setTzSheetOpen(true)}
          trailing={
            <span className="flex items-center gap-1 text-xs font-semibold text-text-faint">
              {user.timezone}
              <ChevronRight size={15} />
            </span>
          }
        />
      </Section>

      <Section title="Notificações">
        <div className="flex items-center gap-3 border-b border-border-soft px-4 py-3.5">
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
        <Row
          icon={<SlidersHorizontal size={17} />}
          label="Tipos de notificação"
          onClick={() => setPrefsOpen(true)}
          trailing={
            <span className="flex items-center gap-1 text-xs font-semibold text-text-faint">
              {activeEvents} de {NOTIFICATION_EVENT_KEYS.length}
              <ChevronRight size={15} />
            </span>
          }
        />
      </Section>

      <Section title="Tarefas concluídas">
        <OptionRow
          label="Perguntar quando concluir"
          description="Quando todas as tarefas de um projeto forem concluídas, você escolhe se ele fica em ativos ou é concluído."
          selected={!user.autoCompleteProjects}
          onClick={() => updateProfile({ autoCompleteProjects: false })}
        />
        <OptionRow
          label="Concluir automaticamente"
          description="Quando todas as tarefas de um projeto forem concluídas, ele é movido direto para Concluídos, sem perguntar."
          selected={user.autoCompleteProjects}
          onClick={() => updateProfile({ autoCompleteProjects: true })}
        />
      </Section>

      <Section title="Conta">
        <Row icon={<Monitor size={17} />} label="Desconectar de outros dispositivos" onClick={handleSignOutOtherDevices} />
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

      <NotificationPrefsSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} />

      <Sheet
        open={tzSheetOpen}
        onClose={() => setTzSheetOpen(false)}
        title="Fuso horário"
        subtitle="Detectado automaticamente ao criar a conta"
      >
        <div className="flex flex-col gap-1.5">
          {listTimezones(user.timezone).map((tz) => {
            const isCurrent = tz === user.timezone
            return (
              <button
                key={tz}
                onClick={() => {
                  updateProfile({ timezone: tz })
                  setTzSheetOpen(false)
                }}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors',
                  isCurrent ? 'bg-accent-soft text-accent' : 'text-text',
                )}
              >
                {tz}
                {isCurrent && <Check size={16} />}
              </button>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}
