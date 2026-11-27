import { Headphones, Pause, Pencil, PictureInPicture2, Play, Plus, RotateCcw, SkipBack, SkipForward, Timer, Trash2, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Field } from '@/components/ui/Input'
import { FOCUS_MUSIC_SOURCE, FOCUS_TRACKS } from '@/lib/focusMusic'
import { openFocusPip, pipMode } from '@/lib/focusPip'
import { renderFocusMiniPlayer } from '@/components/widgets/renderFocusMiniPlayer'
import { parseYouTubeLink } from '@/lib/youtubeLink'
import { useAuthStore } from '@/store/authStore'
import { MAX_FOCUS_TIMERS, MAX_TIMER_MINUTES, usePomodoroStore, type FocusTimerDefinition } from '@/store/pomodoroStore'

const iconButton = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:bg-accent-soft'

function TimerEditor({ definition, onClose }: { definition?: FocusTimerDefinition; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(definition?.name ?? '')
  const [minutes, setMinutes] = useState(definition ? String(definition.totalSeconds / 60) : '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const addTimer = usePomodoroStore((s) => s.addTimer)
  const updateTimer = usePomodoroStore((s) => s.updateTimer)
  const removeTimer = usePomodoroStore((s) => s.removeTimer)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return createPortal(
    <dialog ref={dialog} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="focus-editor-title" className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl border border-border bg-base-alt p-5 text-text shadow-2xl backdrop:bg-black/65">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 id="focus-editor-title" className="text-lg font-bold">{definition ? 'Editar timer' : 'Novo timer'}</h2><button type="button" className={iconButton} aria-label="Fechar editor de timer" onClick={onClose}><X size={18} /></button></div>
      <form className="flex flex-col gap-4" onSubmit={(event) => {
        event.preventDefault()
        const saved = definition ? updateTimer(definition.id, name, Number(minutes)) : addTimer(name, Number(minutes))
        if (saved) onClose()
        else setError('Não foi possível salvar. Confira o nome, a duração e o limite de 10 timers.')
      }}>
        <Field autoFocus label="Nome do timer" placeholder="Ex.: Leitura, estudo, pausa…" maxLength={60} required value={name} onChange={(event) => setName(event.target.value)} />
        <Field label="Duração em minutos" type="number" inputMode="numeric" placeholder="Ex.: 25" min={1} max={MAX_TIMER_MINUTES} step={1} required value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        <p className="text-xs text-text-muted">De 1 a {MAX_TIMER_MINUTES} minutos.{definition && ' Alterar a duração reinicia a contagem e pausa o timer.'}</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={!name.trim() || !minutes} className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{definition ? 'Salvar timer' : 'Adicionar timer'}</button>
        {definition && (confirmDelete ? <div className="rounded-xl border border-border-soft p-3"><p className="mb-2 text-sm">Excluir este timer? Se estiver em andamento, a sessão será encerrada.</p><div className="flex gap-3"><button type="button" className="min-h-11 flex-1 rounded-xl bg-surface text-sm" onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="min-h-11 flex-1 rounded-xl bg-danger text-sm font-semibold text-white" onClick={() => { removeTimer(definition.id); onClose() }}>Confirmar exclusão</button></div></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-danger"><Trash2 size={16} aria-hidden="true" />Excluir timer</button>)}
      </form>
    </dialog>, document.body,
  )
}

function FocusTimer({ definition, onEdit }: { definition: FocusTimerDefinition; onEdit: () => void }) {
  const timer = usePomodoroStore((s) => s.timers[definition.id])
  const toggle = usePomodoroStore((s) => s.toggle)
  const reset = usePomodoroStore((s) => s.reset)
  const secondsLeft = timer?.secondsLeft ?? definition.totalSeconds
  const running = timer?.running ?? false
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')
  const status = running ? 'Em andamento' : secondsLeft === 0 ? 'Concluído' : secondsLeft < definition.totalSeconds ? 'Pausado' : 'Pronto para começar'

  return (
    <div data-focus-timer={definition.id} className="min-w-0 rounded-xl bg-surface-alt p-3">
      <div className="mb-1 flex items-center justify-between gap-2"><p title={definition.name} className="min-w-0 break-words text-sm font-semibold text-text">{definition.name}</p><button type="button" onClick={onEdit} className={iconButton} aria-label={`Editar ${definition.name}`}><Pencil size={16} /></button></div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-3xl font-bold tabular-nums text-text" role="timer" aria-label={`Tempo restante de ${definition.name}`}>{minutes}:{seconds}</p><p className="mt-1 text-xs text-text-muted" role="status">{status}</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => reset(definition.id)} className={iconButton} aria-label={`Reiniciar ${definition.name}`}><RotateCcw size={17} /></button>
          <button type="button" onClick={() => toggle(definition.id)} className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`${running ? 'Pausar' : 'Iniciar'} ${definition.name}`}>
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      </div>
      <progress max={definition.totalSeconds} value={definition.totalSeconds - secondsLeft} aria-label={`Progresso de ${definition.name}`} className="mt-3 block h-1 w-full overflow-hidden rounded-full accent-accent" />
    </div>
  )
}

function FocusMusic() {
  const userId = useAuthStore((s) => s.currentUserId)
  const source = usePomodoroStore((s) => s.musicSource)
  const youtubeUrl = usePomodoroStore((s) => userId ? s.youtubeUrls[userId] ?? '' : '')
  const collapsed = usePomodoroStore((s) => s.youtubeVideoCollapsed)
  const setSource = usePomodoroStore((s) => s.setMusicSource)
  const setYouTubeUrl = usePomodoroStore((s) => s.setYouTubeUrl)
  const setCollapsed = usePomodoroStore((s) => s.setYouTubeVideoCollapsed)
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  const [linkError, setLinkError] = useState('')
  const enabled = usePomodoroStore((s) => s.musicEnabled)
  const trackId = usePomodoroStore((s) => s.trackId)
  const volume = usePomodoroStore((s) => s.volume)
  const error = usePomodoroStore((s) => s.musicError)
  const status = usePomodoroStore((s) => s.musicStatus)
  const setEnabled = usePomodoroStore((s) => s.setMusicEnabled)
  const setTrack = usePomodoroStore((s) => s.setTrack)
  const nextTrack = usePomodoroStore((s) => s.nextTrack)
  const setVolume = usePomodoroStore((s) => s.setVolume)
  return (
    <section aria-label="Música de foco" className="min-w-0 rounded-xl border border-border-soft p-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-2"><Headphones size={18} className="text-accent" aria-hidden="true" /><span className="flex-1 text-sm font-semibold text-text">{source === 'youtube' ? 'Música do YouTube' : 'Música lo-fi'}</span><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-accent" /></label>
      {enabled && <div className="mt-2 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-muted">Fonte da música<select aria-label="Fonte da música" value={source} onChange={(event) => setSource(event.target.value as 'lofi' | 'youtube')} className="h-11 w-full rounded-xl border border-border bg-surface px-2 text-sm text-text"><option value="lofi">Lo-fi do TASKEZ</option><option value="youtube">YouTube · vídeo ou playlist</option></select></label>
        {source === 'youtube' ? <form className="flex min-w-0 flex-col gap-2" onSubmit={(event) => {
          event.preventDefault()
          if (!setYouTubeUrl(linkDraft ?? youtubeUrl)) setLinkError('Cole um link válido de vídeo ou playlist do YouTube.')
          else { setLinkDraft(null); setLinkError('') }
        }}>
          <Field label="Link do YouTube" aria-label="Link do YouTube" aria-invalid={Boolean(linkError)} type="text" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={linkDraft ?? youtubeUrl} onChange={(event) => { setLinkDraft(event.target.value); setLinkError('') }} error={linkError} />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text"><input type="checkbox" checked={collapsed} onChange={(event) => setCollapsed(event.target.checked)} className="h-5 w-5 accent-accent" />Vídeo colapsado</label>
          <button type="submit" className="min-h-11 rounded-xl bg-accent-soft px-3 text-sm font-semibold text-accent">Usar link do YouTube</button>
          {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-xs text-text-muted underline">Abrir link salvo no YouTube</a>}
        </form> : <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-text-muted">Começar por
          <select aria-label="Faixa lo-fi" value={trackId} onChange={(event) => setTrack(event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-2 text-sm text-text focus-visible:outline-accent">{FOCUS_TRACKS.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</select>
        </label>}
        <div className="flex flex-wrap items-center gap-2"><button type="button" className={iconButton} disabled={source === 'youtube' && !parseYouTubeLink(youtubeUrl)?.playlistId} aria-label="Música anterior" onClick={() => nextTrack(-1)}><SkipBack size={17} /></button><button type="button" className={iconButton} disabled={source === 'youtube' && !parseYouTubeLink(youtubeUrl)?.playlistId} aria-label="Próxima música" onClick={() => nextTrack()}><SkipForward size={17} /></button><span className="min-w-0 flex-1 text-xs text-text-muted" role="status">{status === 'playing' ? 'Tocando com o timer' : status === 'loading' ? 'Carregando música…' : status === 'error' ? 'Música indisponível' : 'Inicie um timer para ouvir'}</span></div>
        <label className="flex min-h-11 items-center gap-3 text-xs text-text-muted"><Volume2 size={17} aria-hidden="true" /><span>Volume</span><input aria-label="Volume da música" type="range" min={0} max={100} step={1} value={Math.round(volume * 100)} onChange={(event) => setVolume(Number(event.target.value) / 100)} className="min-w-0 flex-1 accent-accent" /><span className="w-9 text-right tabular-nums">{Math.round(volume * 100)}%</span></label>
        {error && <div role="alert"><p className="text-xs text-danger">{error}</p><button type="button" onClick={() => setEnabled(true)} className="min-h-11 text-sm font-semibold text-accent">Tentar tocar novamente</button></div>}
        {source === 'youtube' ? <><button type="button" onClick={() => setEnabled(true)} className="min-h-11 text-left text-sm font-semibold text-accent">Retomar música do YouTube</button><p className="text-xs leading-relaxed text-text-muted">O player acompanha os timers. Playlists seguem a ordem do YouTube; vídeos individuais se repetem. Se o navegador bloquear o áudio, expanda o vídeo e toque no play.</p></> : <><p className="text-xs leading-relaxed text-text-muted">{FOCUS_TRACKS.length} faixas em sequência e repetição. A música acompanha os timers e pausa quando todos param.</p><a href={FOCUS_MUSIC_SOURCE} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-xs text-text-muted underline underline-offset-4">Open Lo-Fi · CC0 · créditos e licença</a></>}
      </div>}
    </section>
  )
}

export function FocusTimers() {
  const userId = useAuthStore((s) => s.currentUserId)
  const definitions = usePomodoroStore((s) => s.definitions)
  const timers = definitions.filter((timer) => timer.userId === userId)
  const [editor, setEditor] = useState<{ definition?: FocusTimerDefinition } | null>(null)
  const [pipAvailable] = useState(() => pipMode() !== null)
  const [pipError, setPipError] = useState(false)
  return (
    <div data-focus-panel className="flex min-w-0 flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2"><h3 className="flex flex-1 items-center gap-2 text-sm font-bold text-text"><Timer size={17} className="text-accent" aria-hidden="true" />Meus timers</h3>
        {pipAvailable && timers.length > 0 && <button type="button" onClick={() => void openFocusPip(renderFocusMiniPlayer).catch(() => setPipError(true))} aria-label="Abrir janela flutuante do timer" title="Janela flutuante: o timer continua na tela quando você sai do app" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-faint transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"><PictureInPicture2 size={17} /></button>}<span className="text-xs text-text-muted" aria-label={`${timers.length} de ${MAX_FOCUS_TIMERS} timers`}>{timers.length}/{MAX_FOCUS_TIMERS}</span></div>
      {pipError && <p role="alert" className="text-xs text-danger">Não foi possível abrir a janela flutuante neste navegador.</p>}
      {!timers.length && <p className="text-sm leading-relaxed text-text-muted">Crie seu primeiro timer e dê um ritmo ao seu foco.</p>}
      {timers.map((definition) => <FocusTimer key={definition.id} definition={definition} onEdit={() => setEditor({ definition })} />)}
      <button type="button" disabled={timers.length >= MAX_FOCUS_TIMERS} onClick={() => setEditor({})} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-text-faint disabled:opacity-60"><Plus size={18} aria-hidden="true" />{timers.length >= MAX_FOCUS_TIMERS ? 'Limite de 10 timers atingido' : 'Adicionar timer'}</button>
      <FocusMusic />
      {editor && <TimerEditor definition={editor.definition} onClose={() => setEditor(null)} />}
    </div>
  )
}
