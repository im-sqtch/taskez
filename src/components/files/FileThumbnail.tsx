import { File, FileText, Image, Music, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { filePreviewKind, getFileViewUrl } from '@/lib/fileUrls'
import type { ProjectFile } from '@/types'

const ICONS = { image: Image, pdf: FileText, text: FileText, video: Video, audio: Music } as const

// Quadradinho do arquivo em listas: miniatura real para imagens, ícone do tipo
// para o resto (mesmo tile `rounded-lg bg-surface-alt` do DESIGN.md).
export function FileThumbnail({ file }: { file: Pick<ProjectFile, 'name' | 'type' | 'storagePath'> }) {
  const kind = filePreviewKind(file)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (kind !== 'image') return
    let cancelled = false
    void getFileViewUrl(file.storagePath).then((signedUrl) => { if (!cancelled) setUrl(signedUrl) })
    return () => { cancelled = true }
  }, [file.storagePath, kind])

  const Icon = kind ? ICONS[kind] : File
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-text-muted">
      {url && !failed
        ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <Icon size={18} />}
    </div>
  )
}
