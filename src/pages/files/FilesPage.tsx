import { ArrowLeft, Download, File, FileText, Image, Paperclip, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBytes, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { confirmAction } from '@/store/confirmStore'
import { useDataStore, useCurrentWorkspace, useWorkspaceFiles, useWorkspaceProjects } from '@/store/dataStore'
import type { ProjectFile } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — arquivos ficam no Supabase Storage

function iconFor(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf' || type.startsWith('text/')) return FileText
  return File
}

export function FilesPage() {
  const navigate = useNavigate()
  const workspace = useCurrentWorkspace()
  const projects = useWorkspaceProjects()
  const allFiles = useWorkspaceFiles()
  const addFile = useDataStore((s) => s.addFile)
  const removeFile = useDataStore((s) => s.removeFile)
  const currentUser = useAuthStore((s) => s.currentUser())
  // Só quem enviou o arquivo ou o dono do workspace pode apagá-lo (ver policy
  // de delete em `files`) — a UI espelha essa regra escondendo o botão pra
  // quem não tem permissão.
  const isWorkspaceOwner = useDataStore((s) => (workspace ? s.workspaceRoles[workspace.id] === 'owner' : false))
  const canRemove = (file: ProjectFile) => isWorkspaceOwner || file.uploadedBy === currentUser?.id
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const files = [...allFiles].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const projectNamesFor = (file: ProjectFile) =>
    file.projectIds.map((id) => projects.find((p) => p.id === id)?.name).filter((n): n is string => Boolean(n))

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentUser || !workspace) return

    if (file.size > MAX_FILE_SIZE) {
      setError(`"${file.name}" tem ${formatBytes(file.size)}. O limite é ${formatBytes(MAX_FILE_SIZE)} por arquivo.`)
      return
    }

    setError(null)
    setUploading(true)
    const storagePath = `${workspace.id}/geral/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('project-files').upload(storagePath, file)
    if (uploadError) {
      setError('Não foi possível enviar esse arquivo.')
      setUploading(false)
      return
    }
    addFile({
      workspaceId: workspace.id,
      projectIds: [],
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      storagePath,
      uploadedBy: currentUser.id,
    })
    setUploading(false)
  }

  async function handleDownload(file: ProjectFile) {
    setDownloadingId(file.id)
    const { data, error: signError } = await supabase.storage.from('project-files').createSignedUrl(file.storagePath, 60)
    setDownloadingId(null)
    if (signError || !data) {
      setError('Não foi possível baixar esse arquivo.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  function handleRemove(file: ProjectFile) {
    confirmAction({
      title: 'Excluir arquivo',
      description: `Excluir "${file.name}"? Ele vai para a Lixeira e pode ser restaurado em até 30 dias.`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => removeFile(file.id),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <ArrowLeft size={19} />
        </button>
        <h1 className="text-xl font-bold text-text">Arquivos</h1>
      </header>

      <div className="flex flex-col gap-3 px-5">
        <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload size={15} />}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="self-start"
        >
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
        <p className="text-xs text-text-faint">Até {formatBytes(MAX_FILE_SIZE)} por arquivo, visível para toda a equipe do workspace.</p>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}

        {files.length === 0 ? (
          <EmptyState icon={<Paperclip size={22} />} title="Nenhum arquivo ainda" description="Envie documentos, imagens e outros arquivos do workspace." />
        ) : (
          <div className="flex flex-col gap-2">
            {files.map((file) => {
              const Icon = iconFor(file.type)
              const projectNames = projectNamesFor(file)
              return (
                <div key={file.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{file.name}</p>
                    <p className="text-xs text-text-faint">
                      {formatBytes(file.size)} · {formatDate(file.createdAt)}
                    </p>
                    {projectNames.length > 0 ? (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {projectNames.map((name) => (
                          <p key={name} className="truncate text-xs text-text-faint">
                            {name}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-faint">Nenhum projeto</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-accent disabled:opacity-40"
                    aria-label={`Baixar ${file.name}`}
                  >
                    <Download size={16} />
                  </button>
                  {canRemove(file) && (
                    <button
                      onClick={() => handleRemove(file)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-text-faint hover:text-danger"
                      aria-label={`Excluir ${file.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
