import type { KeyboardEvent } from 'react'

// Teclado de celular não tem Shift+Enter, então lá o Enter é sempre quebra de
// linha (como no WhatsApp) e o envio fica só no botão. Com teclado físico vale
// a convenção de sempre: Enter envia, Shift+Enter quebra a linha.
export function hasTouchKeyboard() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

// Diz se este Enter deve enviar/criar em vez de quebrar a linha.
export function isSubmitEnter(event: KeyboardEvent<HTMLTextAreaElement>, touchKeyboard: boolean) {
  if (event.key !== 'Enter' || touchKeyboard || event.shiftKey) return false
  // Enquanto o IME está compondo (acentos, teclados asiáticos), o Enter
  // confirma a palavra — não pode ser confundido com envio.
  return !event.nativeEvent.isComposing
}
