// Junta os links já confirmados com um rascunho ainda não confirmado (se houver
// texto nele) — usado no submit do formulário para não perder a última linha.
export function withDraft(links: string[], draft: string): string[] {
  const trimmed = draft.trim()
  return trimmed ? [...links, trimmed] : links
}
