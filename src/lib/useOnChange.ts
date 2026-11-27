import { useState } from 'react'

// Chama `onChange` durante a renderização sempre que `value` muda (e na
// primeira renderização). É o jeito recomendado pelo React para "reiniciar
// estado quando uma prop muda" — por exemplo, limpar um formulário quando o
// Sheet abre — sem `useEffect` e sem uma renderização intermediária com dados
// velhos. `onChange` só deve atualizar estado do próprio componente.
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
export function useOnChange<T>(value: T, onChange: (value: T) => void) {
  const [previous, setPrevious] = useState<{ value: T } | null>(null)
  if (previous === null || !Object.is(previous.value, value)) {
    setPrevious({ value })
    onChange(value)
  }
}
