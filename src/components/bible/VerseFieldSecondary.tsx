'use client'

import { useState, useId } from 'react'
import BibleVerseSelector from './BibleVerseSelector'

export interface VerseFieldSecondaryProps {
  name?: string
  defaultValue?: string[]
  label?: string
  maxVerses?: number
}

interface VerseEntry {
  id: string
  value: string
}

let counter = 0
function uid() { return `verse-${++counter}` }

export default function VerseFieldSecondary({
  name = 'secondary_verses',
  defaultValue,
  label = 'Versículos secundários',
  maxVerses = 10,
}: VerseFieldSecondaryProps) {
  const baseId = useId()

  const [entries, setEntries] = useState<VerseEntry[]>(() =>
    defaultValue && defaultValue.length > 0
      ? defaultValue.map((v) => ({ id: uid(), value: v }))
      : []
  )

  function addEntry() {
    if (entries.length >= maxVerses) return
    setEntries((prev) => [...prev, { id: uid(), value: '' }])
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function updateEntry(id: string, value: string) {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, value } : e))
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label} <span className="font-normal text-[var(--mt-muted)]">(opcional)</span></span>
        {entries.length > 0 && (
          <span className="text-xs text-[var(--mt-muted)]">{entries.length}/{maxVerses}</span>
        )}
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-[var(--mt-muted)]">Nenhum versículo secundário adicionado.</p>
      )}

      <div className="flex flex-col gap-4">
        {entries.map((entry, index) => (
          <div key={entry.id} className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--mt-muted)]">Versículo {index + 1}</span>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                aria-label={`Remover versículo ${index + 1}`}
                className="text-xs text-[var(--mt-muted)] hover:text-red-500 transition-colors"
              >
                ✕ Remover
              </button>
            </div>
            <BibleVerseSelector
              id={`${baseId}-${entry.id}`}
              value={entry.value || undefined}
              onChange={(v) => updateEntry(entry.id, v)}
            />
            <input type="hidden" name={name} value={entry.value} />
          </div>
        ))}
      </div>

      {entries.length < maxVerses && (
        <button
          type="button"
          onClick={addEntry}
          className="self-start flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--mt-border)] px-4 py-2 text-xs font-medium text-[var(--mt-muted)] hover:border-[var(--mt-navy)] hover:text-[var(--mt-text)] transition-colors"
        >
          <span aria-hidden>+</span> Adicionar versículo secundário
        </button>
      )}
    </div>
  )
}
