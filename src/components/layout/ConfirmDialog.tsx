import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Input'
import { useConfirmStore } from '@/store/confirmStore'

export function ConfirmDialog() {
  const options = useConfirmStore((s) => s.options)
  const close = useConfirmStore((s) => s.close)
  const [typed, setTyped] = useState('')

  // Zera o campo sempre que um novo diálogo é aberto (inclusive reabrindo o
  // mesmo tipo de ação em seguida) — cada `confirmAction(...)` cria um objeto
  // novo, então a identidade de `options` muda a cada abertura.
  useEffect(() => {
    setTyped('')
  }, [options])

  if (!options) return null

  const needsTypedConfirmation = Boolean(options.confirmText)
  const confirmDisabled = needsTypedConfirmation && typed !== options.confirmText

  function handleConfirm() {
    if (confirmDisabled) return
    options!.onConfirm()
    close()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-border bg-surface-alt p-5 animate-[confirm-in_0.15s_ease-out]">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-bold text-text">{options.title}</h2>
          {options.description && <p className="text-sm leading-relaxed text-text-muted">{options.description}</p>}
        </div>
        {needsTypedConfirmation && (
          <Field
            label={`Digite "${options.confirmText}" para confirmar`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        )}
        <div className="flex gap-2.5">
          {!options.hideCancel && (
            <Button variant="secondary" size="sm" fullWidth onClick={close}>
              {options.cancelLabel ?? 'Cancelar'}
            </Button>
          )}
          <Button
            variant={options.danger ? 'danger' : 'primary'}
            size="sm"
            fullWidth
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {options.confirmLabel ?? (options.hideCancel ? 'OK' : 'Confirmar')}
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes confirm-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  )
}
