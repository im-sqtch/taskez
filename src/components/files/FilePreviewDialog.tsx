import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, ExternalLink, File, LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { filePreviewKind, getFileDownloadUrl, getFileViewUrl } from '@/lib/fileUrls'
import { formatBytes } from '@/lib/utils'
import type { ProjectFile } from '@/types'

// Prévia de texto limitada para não travar a tela com arquivos grandes.
const MAX_TEXT_CHARS = 200_000

const roundButton = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:text-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent'

interface FilePreviewDialogProps {
  files: ProjectFile[]
  // Índice do arquivo aberto em `files`; null fecha a prévia.
  index: number | null
  onIndexChange: (index: number | null) => void
}

// Visualizador em tela cheia para anexos: imagem, PDF, vídeo, áudio e texto.
// Outros tipos mostram só os dados do arquivo e o botão de baixar.
export function FilePreviewDialog({ files, index, onIndexChange }: FilePreviewDialogProps) {
  const file = index !== null ? files[index] : undefined
  const hasMany = files.length > 1

  useEffect(() => {
    if (index === null) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onIndexChange(null)
      if (!hasMany || index === null) return
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % files.length)
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + files.length) % files.length)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [index, hasMany, files.length, onIndexChange])

  // O arquivo aberto pode ter sido desvinculado/excluído enquanto a prévia estava aberta.
  useEffect(() => {
    if (index !== null && !file) onIndexChange(null)
  }, [index, file, onIndexChange])

  return createPortal(
    <AnimatePresence>
      {file && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Prévia de ${file.name}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/85 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <header className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{file.name}</p>
              <p className="text-xs text-white/60">{formatBytes(file.size)}{hasMany && index !== null && ` · ${index + 1} de ${files.length}`}</p>
            </div>
            <PreviewActions file={file} />
            <button type="button" onClick={() => onIndexChange(null)} aria-label="Fechar prévia" className={roundButton}><X size={18} /></button>
          </header>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-5 pb-5" onClick={(event) => { if (event.target === event.currentTarget) onIndexChange(null) }}>
            <PreviewBody key={file.id} file={file} />
            {hasMany && index !== null && <>
              <button type="button" onClick={() => onIndexChange((index - 1 + files.length) % files.length)} aria-label="Anexo anterior" className={`${roundButton} absolute left-3 top-1/2 -translate-y-1/2`}><ChevronLeft size={20} /></button>
              <button type="button" onClick={() => onIndexChange((index + 1) % files.length)} aria-label="Próximo anexo" className={`${roundButton} absolute right-3 top-1/2 -translate-y-1/2`}><ChevronRight size={20} /></button>
            </>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function PreviewActions({ file }: { file: ProjectFile }) {
  const [busy, setBusy] = useState(false)
  async function open(download: boolean) {
    setBusy(true)
    const url = download ? await getFileDownloadUrl(file) : await getFileViewUrl(file.storagePath)
    setBusy(false)
    if (!url) return
    if (download) window.location.assign(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }
  return (
    <>
      <button type="button" disabled={busy} onClick={() => void open(false)} aria-label={`Abrir ${file.name} em nova aba`} title="Abrir em nova aba" className={roundButton}><ExternalLink size={16} /></button>
      <button type="button" disabled={busy} onClick={() => void open(true)} aria-label={`Baixar ${file.name}`} title="Baixar" className={roundButton}><Download size={16} /></button>
    </>
  )
}

function PreviewBody({ file }: { file: ProjectFile }) {
  const kind = filePreviewKind(file)
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!kind) return
    let cancelled = false
    void getFileViewUrl(file.storagePath).then(async (signedUrl) => {
      if (cancelled) return
      if (!signedUrl) { setFailed(true); return }
      if (kind !== 'text') { setUrl(signedUrl); return }
      try {
        const response = await fetch(signedUrl)
        if (!response.ok) throw new Error(String(response.status))
        const content = await response.text()
        if (!cancelled) setText(content.length > MAX_TEXT_CHARS ? `${content.slice(0, MAX_TEXT_CHARS)}\n\n… (prévia cortada — baixe o arquivo para ver tudo)` : content)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })
    return () => { cancelled = true }
  }, [file.storagePath, kind])

  if (!kind || failed) {
    return (
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-text-faint"><File size={28} /></div>
        <p className="font-semibold text-text">{failed ? 'Não foi possível carregar a prévia' : 'Prévia indisponível para este tipo de arquivo'}</p>
        <p className="text-sm text-text-muted">Use o botão de baixar para abrir o arquivo.</p>
      </div>
    )
  }
  if (kind === 'text' ? text === null : !url) return <LoaderCircle size={28} className="animate-spin text-white/70" aria-label="Carregando prévia" />

  if (kind === 'image') return <img src={url!} alt={file.name} onError={() => setFailed(true)} className="max-h-full max-w-full rounded-xl object-contain" />
  if (kind === 'pdf') return <iframe src={url!} title={file.name} className="h-full w-full max-w-5xl rounded-xl bg-white" />
  if (kind === 'video') return <video src={url!} controls playsInline onError={() => setFailed(true)} className="max-h-full max-w-full rounded-xl" />
  if (kind === 'audio') return <audio src={url!} controls onError={() => setFailed(true)} className="w-full max-w-md" />
  return <pre className="h-full w-full max-w-4xl overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border bg-surface p-4 text-sm text-text">{text}</pre>
}
