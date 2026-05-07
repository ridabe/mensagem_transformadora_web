'use client'

import { useState } from 'react'
import BibleVerseSelector from './BibleVerseSelector'

export interface VerseFieldMainProps {
  name?: string
  defaultValue?: string
  required?: boolean
  label?: string
}

export default function VerseFieldMain({
  name = 'main_verse',
  defaultValue,
  required,
  label = 'Versículo principal',
}: VerseFieldMainProps) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [isLegacy, setIsLegacy] = useState(() => {
    // Se tem valor mas não é parseável pelo seletor, entra em modo legado
    if (!defaultValue) return false
    const looksLikeStructured = /^.+\s\d+:\d/.test(defaultValue)
    return !looksLikeStructured
  })

  if (isLegacy) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <span className="font-semibold">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col gap-3">
          <p className="text-xs text-amber-800 leading-5">
            Este versículo está em formato antigo e não pode ser carregado no seletor automaticamente.
            Selecione-o novamente para atualizar.
          </p>
          <input
            type="text"
            value={value}
            readOnly
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none opacity-60"
          />
          <button
            type="button"
            onClick={() => { setValue(''); setIsLegacy(false) }}
            className="self-start text-xs font-medium text-[var(--mt-navy)] underline underline-offset-2"
          >
            Selecionar no seletor
          </button>
        </div>
        <input type="hidden" name={name} value={value} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-semibold">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <BibleVerseSelector
        id={name}
        value={defaultValue}
        required={required}
        onChange={setValue}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
