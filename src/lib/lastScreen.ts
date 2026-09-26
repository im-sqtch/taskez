const STORAGE_PREFIX = 'taskez:last-screen:'
const DEFAULT_SCREEN = '/dashboard'

// Somente telas do sistema; login e onboarding nunca substituem a última tela.
function isAppScreen(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0]
  return /^\/(dashboard|files|profile|settings|trash)$/.test(pathname)
    || /^\/projects(?:\/[^/?#]+(?:\/tasks\/[^/?#]+)?)?$/.test(pathname)
    || /^\/tasks(?:\/[^/?#]+)?$/.test(pathname)
}

export function getLastScreen(userId: string | null): string {
  if (!userId) return DEFAULT_SCREEN
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    return saved && isAppScreen(saved) ? saved : DEFAULT_SCREEN
  } catch {
    return DEFAULT_SCREEN
  }
}

export function saveLastScreen(userId: string, path: string): void {
  if (!isAppScreen(path)) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, path)
  } catch {
    // O app continua funcionando se o navegador bloquear o armazenamento.
  }
}
