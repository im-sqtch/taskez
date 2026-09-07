// Lista simplificada de fusos horários: apenas o offset fixo em relação ao UTC,
// sem nomes de região nem ajuste automático de horário de verão.
export const UTC_OFFSETS: number[] = Array.from({ length: 25 }, (_, i) => i - 12)

export function formatUtcOffset(offset: number): string {
  if (offset === 0) return 'UTC'
  return `UTC${offset > 0 ? '+' : ''}${offset}`
}

// Offset do dispositivo no momento do cadastro, arredondado para a hora cheia
// mais próxima (a lista só oferece offsets inteiros) e limitado a ±12.
export function detectUtcOffset(): string {
  try {
    const offsetHours = Math.round(-new Date().getTimezoneOffset() / 60)
    const clamped = Math.max(-12, Math.min(12, offsetHours))
    return formatUtcOffset(clamped)
  } catch {
    return 'UTC'
  }
}
