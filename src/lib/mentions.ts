export type MentionType = 'project' | 'task' | 'member' | 'file'

export interface MentionEntity {
  type: MentionType
  id: string
  name: string
  // Projeto usa a cor do projeto; pessoa usa a cor do avatar.
  color?: string
}

export interface MentionQuery {
  // Índice do "@" que abriu a menção.
  start: number
  // Texto digitado entre o "@" e o cursor (pode conter espaços).
  query: string
}

// Nomes com espaço precisam continuar buscando depois do espaço ("@Planejamento
// Semanal"), mas sem um teto um "@" solto deixaria o dropdown tentando casar o
// parágrafo inteiro.
const MAX_QUERY_WORDS = 6
const MAX_QUERY_LENGTH = 60

// Um "@" só abre menção no começo do texto ou depois de espaço/pontuação de
// abertura — assim "email@dominio.com" não vira menção.
function isOpeningBoundary(char: string | undefined) {
  return char === undefined || /[\s([{,;:]/.test(char)
}

// O caractere logo depois do nome não pode ser letra/número: sem isso, com uma
// pessoa chamada "Ana" no workspace, "@Anabela" viraria "@Ana" + "bela".
function isClosingBoundary(char: string | undefined) {
  return char === undefined || !/[\p{L}\p{N}_]/u.test(char)
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

// Detecta se o cursor está dentro de uma menção sendo digitada.
export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret)
  const start = before.lastIndexOf('@')
  if (start === -1) return null
  if (!isOpeningBoundary(before[start - 1])) return null

  const query = before.slice(start + 1)
  if (query.length > MAX_QUERY_LENGTH) return null
  if (query.includes('\n')) return null
  if (query.split(/\s+/).filter(Boolean).length > MAX_QUERY_WORDS) return null

  return { start, query }
}

// Busca sem acento e sem diferenciar maiúsculas; quem começa com o termo vem
// primeiro, depois os nomes mais curtos.
export function filterMentionEntities(entities: MentionEntity[], query: string, limit = 8): MentionEntity[] {
  const term = normalize(query.trim())
  if (!term) return entities.slice(0, limit)
  return entities
    .filter((entity) => normalize(entity.name).includes(term))
    .sort((a, b) => {
      const aStarts = normalize(a.name).startsWith(term) ? 0 : 1
      const bStarts = normalize(b.name).startsWith(term) ? 0 : 1
      return aStarts - bStarts || a.name.length - b.name.length
    })
    .slice(0, limit)
}

// Troca o "@rascunho" pelo nome completo da entidade escolhida e devolve onde o
// cursor deve ficar depois da troca.
export function applyMention(text: string, mention: MentionQuery, entity: MentionEntity): { text: string; caret: number } {
  const before = text.slice(0, mention.start)
  const after = text.slice(mention.start + 1 + mention.query.length)
  const inserted = `@${entity.name}`
  const spacer = after.startsWith(' ') ? '' : ' '
  return {
    text: `${before}${inserted}${spacer}${after}`,
    caret: before.length + inserted.length + spacer.length,
  }
}

export type MentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; entity: MentionEntity; label: string }

// Quebra o texto salvo em pedaços de texto puro e menções resolvidas. O nome
// mais longo ganha, para "@Planejamento Semanal" não casar só "@Planejamento".
export function parseMentions(text: string, entities: MentionEntity[]): MentionSegment[] {
  if (!text) return []

  const candidates = entities
    .filter((entity) => entity.name.trim().length > 0)
    .map((entity) => ({ entity, lower: entity.name.toLowerCase() }))
    .sort((a, b) => b.lower.length - a.lower.length)

  const lower = text.toLowerCase()
  const segments: MentionSegment[] = []
  let buffer = ''
  let index = 0

  while (index < text.length) {
    if (text[index] === '@' && isOpeningBoundary(text[index - 1])) {
      const match = candidates.find(
        (candidate) =>
          lower.startsWith(candidate.lower, index + 1) &&
          isClosingBoundary(text[index + 1 + candidate.lower.length]),
      )
      if (match) {
        if (buffer) {
          segments.push({ kind: 'text', value: buffer })
          buffer = ''
        }
        segments.push({ kind: 'mention', entity: match.entity, label: text.slice(index + 1, index + 1 + match.lower.length) })
        index += 1 + match.lower.length
        continue
      }
    }
    buffer += text[index]
    index += 1
  }

  if (buffer) segments.push({ kind: 'text', value: buffer })
  return segments
}
