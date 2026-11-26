import { supabase } from '@/lib/supabase'
import type { ProjectFile } from '@/types'

const BUCKET = 'project-files'
// URLs assinadas valem 1h; reaproveitamos até faltarem 5 min para expirar, para
// miniaturas e prévias não pedirem uma URL nova a cada renderização.
const URL_TTL_SECONDS = 60 * 60
const REUSE_MARGIN_MS = 5 * 60 * 1000

const cache = new Map<string, { url: string; expiresAt: number }>()
const inFlight = new Map<string, Promise<string | null>>()

// URL para exibir o arquivo no próprio app (miniatura, prévia).
export function getFileViewUrl(storagePath: string): Promise<string | null> {
  const cached = cache.get(storagePath)
  if (cached && cached.expiresAt - REUSE_MARGIN_MS > Date.now()) return Promise.resolve(cached.url)
  const pending = inFlight.get(storagePath)
  if (pending) return pending
  const request = supabase.storage.from(BUCKET).createSignedUrl(storagePath, URL_TTL_SECONDS).then(({ data, error }) => {
    inFlight.delete(storagePath)
    if (error || !data) return null
    cache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + URL_TTL_SECONDS * 1000 })
    return data.signedUrl
  })
  inFlight.set(storagePath, request)
  return request
}

// URL que força o download com o nome original do arquivo.
export async function getFileDownloadUrl(file: Pick<ProjectFile, 'storagePath' | 'name'>): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.storagePath, 60, { download: file.name })
  return error || !data ? null : data.signedUrl
}

export type FilePreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text'

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'tsv', 'json', 'log', 'xml', 'yaml', 'yml'])
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'])

// O tipo salvo pode vir vazio ou genérico (application/octet-stream) dependendo
// do navegador que enviou, então a extensão serve de reserva.
export function filePreviewKind(file: Pick<ProjectFile, 'type' | 'name'>): FilePreviewKind | null {
  const type = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (type.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (type === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  // HTML fica de fora de propósito: é mostrado só para download, nunca renderizado.
  if (type === 'text/html' || extension === 'html' || extension === 'htm') return null
  if (type.startsWith('text/') || type === 'application/json' || TEXT_EXTENSIONS.has(extension)) return 'text'
  return null
}
