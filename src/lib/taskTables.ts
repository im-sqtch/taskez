import type { TableCellValue, TableColumn, TableColumnType, TableSelectOption, TaskTable } from '@/types'

// Lógica pura das tabelas das tarefas: tipos de coluna, formatação dos valores,
// texto copiado e conversão ao trocar o tipo de uma coluna.

export const COLUMN_TYPES: { type: TableColumnType; label: string }[] = [
  { type: 'text', label: 'Texto' },
  { type: 'number', label: 'Número' },
  { type: 'usd', label: 'Dólar' },
  { type: 'brl', label: 'Real' },
  { type: 'select', label: 'Select' },
  { type: 'multiSelect', label: 'Multi-select' },
  { type: 'date', label: 'Data' },
  { type: 'person', label: 'Pessoa' },
  { type: 'files', label: 'Arquivos' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'link', label: 'Link' },
]

// Cores que o usuário escolhe para as opções de select (como as de projeto).
export const OPTION_COLORS: { color: string; name: string }[] = [
  { color: '#8A94A6', name: 'Cinza' },
  { color: '#A0785A', name: 'Marrom' },
  { color: '#FF8A3D', name: 'Laranja' },
  { color: '#F5A524', name: 'Amarelo' },
  { color: '#34D399', name: 'Verde' },
  { color: '#3B9EFF', name: 'Azul' },
  { color: '#7C5CFF', name: 'Roxo' },
  { color: '#FF7CE0', name: 'Rosa' },
  { color: '#F5455C', name: 'Vermelho' },
]

export const CHECKBOX_LABELS: Record<string, string> = { done: 'Concluído', failed: 'Não cumprido' }

export interface TableLookup {
  members: { id: string; name: string }[]
  files: { id: string; name: string }[]
}

export function columnType(column: TableColumn): TableColumnType {
  return column.type ?? 'text'
}

export function columnTypeLabel(type: TableColumnType): string {
  return COLUMN_TYPES.find((item) => item.type === type)?.label ?? 'Texto'
}

export function isListType(type: TableColumnType) {
  return type === 'multiSelect' || type === 'person' || type === 'files'
}

export function asList(value: TableCellValue | undefined): string[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

export function asText(value: TableCellValue | undefined): string {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

export function isEmptyCell(value: TableCellValue | undefined) {
  return Array.isArray(value) ? value.length === 0 : !value?.trim()
}

export function emptyCell(type: TableColumnType): TableCellValue {
  return isListType(type) ? [] : ''
}

// Aceita "1.234,56", "1234.56", "R$ 10", "-3" e devolve o número canônico ("1234.56").
export function parseNumber(text: string): string | null {
  let cleaned = text.trim().replace(/[^\d.,-]/g, '')
  if (!/\d/.test(cleaned)) return null
  const negative = cleaned.startsWith('-')
  cleaned = cleaned.replace(/-/g, '')
  if (cleaned.includes(',') && cleaned.includes('.') && cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
    // Padrão americano: "1,234.56".
    cleaned = cleaned.replace(/,/g, '')
  } else if (cleaned.includes(',')) {
    // Padrão brasileiro: ponto separa milhar, vírgula separa decimais.
    cleaned = cleaned.replace(/\./g, '').replace(',', '.').replace(/,/g, '')
  } else if ((cleaned.match(/\./g) ?? []).length > 1 || /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // "1.234.567" ou "1.234": pontos de milhar.
    cleaned = cleaned.replace(/\./g, '')
  }
  const number = Number(cleaned)
  if (!Number.isFinite(number)) return null
  return String(negative ? -number : number)
}

export function formatNumber(type: TableColumnType, canonical: string): string {
  const number = Number(canonical)
  if (!canonical || !Number.isFinite(number)) return canonical
  if (type === 'usd') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number).replace('$', 'US$ ')
  if (type === 'brl') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number).replace(/ /g, ' ')
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10 }).format(number)
}

// Número como aparece no campo de edição: "1234,5" (real e número) ou "1234.5" (dólar).
export function numberDraft(type: TableColumnType, canonical: string): string {
  if (!canonical) return ''
  return type === 'usd' ? canonical : canonical.replace('.', ',')
}

// Aceita "2026-11-27", "27/11/2026" e "27/11/26".
export function parseDateText(text: string): string | null {
  const value = text.trim()
  let year: number, month: number, day: number
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value)
  if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  else if (br) [day, month, year] = [Number(br[1]), Number(br[2]), Number(br[3]!.length === 2 ? `20${br[3]}` : br[3])]
  else return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatDateKey(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : key
}

export function toHref(link: string) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`
}

// Os valores de uma célula como textos legíveis (um por item, nas listas).
export function cellTexts(column: TableColumn, value: TableCellValue | undefined, lookup: TableLookup): string[] {
  const type = columnType(column)
  if (isEmptyCell(value)) return []
  switch (type) {
    case 'number':
    case 'usd':
    case 'brl':
      return [formatNumber(type, asText(value))]
    case 'select':
    case 'multiSelect':
      return asList(value).map((id) => column.options?.find((option) => option.id === id)?.name).filter((name): name is string => Boolean(name))
    case 'person':
      return asList(value).map((id) => lookup.members.find((member) => member.id === id)?.name).filter((name): name is string => Boolean(name))
    case 'files':
      return asList(value).map((id) => lookup.files.find((file) => file.id === id)?.name).filter((name): name is string => Boolean(name))
    case 'date':
      return [formatDateKey(asText(value))]
    case 'checkbox':
      return CHECKBOX_LABELS[asText(value)] ? [CHECKBOX_LABELS[asText(value)]!] : []
    default:
      return [asText(value)]
  }
}

// Texto copiado da célula.
export function cellText(column: TableColumn, value: TableCellValue | undefined, lookup: TableLookup): string {
  return cellTexts(column, value, lookup).join(', ')
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase('pt-BR')
}

function addOption(options: TableSelectOption[], name: string): TableSelectOption {
  const existing = options.find((option) => normalizeName(option.name) === normalizeName(name))
  if (existing) return existing
  const option = { id: crypto.randomUUID(), name: name.trim(), color: OPTION_COLORS[options.length % OPTION_COLORS.length]!.color }
  options.push(option)
  return option
}

// Cria (se ainda não existir) uma opção com esse nome na coluna.
export function withOption(column: TableColumn, name: string): { column: TableColumn; option: TableSelectOption } {
  const options = [...(column.options ?? [])]
  const option = addOption(options, name)
  return { column: { ...column, options }, option }
}

// Troca o tipo de uma coluna convertendo os valores que dá para aproveitar.
// `lost` conta as células com valor que perdem tudo ou parte dele.
export function convertColumn(table: TaskTable, columnId: string, toType: TableColumnType, lookup: TableLookup): { table: TaskTable; lost: number } {
  const column = table.columns.find((item) => item.id === columnId)
  if (!column) return { table, lost: 0 }
  const fromType = columnType(column)
  if (fromType === toType) return { table, lost: 0 }
  const keepsOptions = (fromType === 'select' || fromType === 'multiSelect') && (toType === 'select' || toType === 'multiSelect')
  const options: TableSelectOption[] = keepsOptions ? [...(column.options ?? [])] : []
  let lost = 0

  function convert(value: TableCellValue | undefined): TableCellValue {
    if (isEmptyCell(value)) return emptyCell(toType)
    const list = asList(value)
    let texts = cellTexts(column!, value, lookup)
    // Texto livre separado por vírgulas vira várias opções/pessoas.
    if ((fromType === 'text' || fromType === 'link') && isListType(toType)) texts = texts[0]!.split(',').map((item) => item.trim()).filter(Boolean)
    let result: TableCellValue
    let complete = true
    switch (toType) {
      case 'text':
      case 'link':
        result = texts.join(', ')
        break
      case 'number':
      case 'usd':
      case 'brl': {
        const number = texts.length === 1 ? parseNumber(texts[0]!) : null
        result = number ?? ''
        break
      }
      case 'select':
        if (keepsOptions) result = list[0] ?? ''
        else result = texts[0] ? addOption(options, texts[0]).id : ''
        complete = texts.length <= 1
        break
      case 'multiSelect':
        result = keepsOptions ? list : texts.map((text) => addOption(options, text).id)
        break
      case 'date':
        result = texts.length === 1 ? parseDateText(texts[0]!) ?? '' : ''
        break
      case 'person': {
        const ids = texts.map((text) => lookup.members.find((member) => normalizeName(member.name) === normalizeName(text))?.id)
        result = ids.filter((id): id is string => Boolean(id))
        complete = result.length === texts.length
        break
      }
      case 'files':
        result = []
        break
      case 'checkbox': {
        const found = Object.entries(CHECKBOX_LABELS).find(([, label]) => texts.length === 1 && normalizeName(label) === normalizeName(texts[0]!))
        result = found?.[0] ?? ''
        break
      }
    }
    if (isEmptyCell(result) || !complete) lost += 1
    return result
  }

  const rows = table.rows.map((row) => ({ ...row, cells: { ...row.cells, [columnId]: convert(row.cells[columnId]) } }))
  const nextColumn: TableColumn = { id: column.id, title: column.title, type: toType }
  if (toType === 'select' || toType === 'multiSelect') nextColumn.options = options
  return { table: { ...table, columns: table.columns.map((item) => (item.id === columnId ? nextColumn : item)), rows }, lost }
}

// Move um item da lista uma posição para trás (-1) ou para frente (+1).
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (index < 0 || target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export function nextCheckbox(value: string): string {
  return value === '' ? 'done' : value === 'done' ? 'failed' : ''
}
