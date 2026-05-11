'use client'

import { useEffect } from 'react'
import { useBibleSelector } from './useBibleSelector'
import type { SelectionMode } from './useBibleSelector'

export interface BibleVerseSelectorProps {
  value?: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  id?: string
}

const MODES: { key: SelectionMode; label: string }[] = [
  { key: 'single',   label: 'Único' },
  { key: 'range',    label: 'Intervalo' },
  { key: 'multiple', label: 'Múltiplos' },
]

const SELECT_CLASS =
  'h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] text-[var(--mt-text)] px-3 text-sm outline-none ring-[var(--mt-gold)] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-40 w-full [color-scheme:dark]'

export default function BibleVerseSelector({
  value,
  onChange,
  required,
  disabled,
  id,
}: BibleVerseSelectorProps) {
  const {
    books,
    selectedBook,
    selectedChapter,
    selectionMode,
    selectedVerses,
    rangeStart,
    rangeEnd,
    availableChapters,
    availableVerses,
    output,
    selectBook,
    selectChapter,
    selectVerse,
    setSelectionMode,
    setRangeStart,
    setRangeEnd,
    loadFromString,
  } = useBibleSelector(value)

  // Notifica o pai sempre que o output mudar e for válido
  useEffect(() => {
    if (output) onChange(output)
  }, [output]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega valor inicial se vier de prop externa
  useEffect(() => {
    if (value) loadFromString(value)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const atBooks = books.filter((b) => b.testament === 'AT')
  const ntBooks = books.filter((b) => b.testament === 'NT')

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4"
      aria-disabled={disabled}
    >
      {/* Toggle de modo */}
      <div className="flex gap-1 rounded-lg border border-[var(--mt-border)] p-1 w-fit" role="group" aria-label="Modo de seleção">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-pressed={selectionMode === key}
            onClick={() => setSelectionMode(key)}
            className={[
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              selectionMode === key
                ? 'bg-[var(--mt-navy)] text-white'
                : 'text-[var(--mt-muted)] hover:text-[var(--mt-text)]',
              disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Selects encadeados */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Livro */}
        <div className="flex flex-col gap-1.5 text-sm flex-1">
          <label htmlFor={`${id}-book`} className="font-medium text-xs text-[var(--mt-muted)]">
            Livro
          </label>
          <select
            id={`${id}-book`}
            disabled={disabled}
            required={required}
            value={selectedBook?.id ?? ''}
            onChange={(e) => selectBook(Number(e.target.value))}
            className={SELECT_CLASS}
            aria-label="Livro bíblico"
          >
            <option value="" disabled>Selecione o livro</option>
            <optgroup label="Antigo Testamento">
              {atBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
            <optgroup label="Novo Testamento">
              {ntBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Capítulo */}
        <div className="flex flex-col gap-1.5 text-sm w-full sm:w-28">
          <label htmlFor={`${id}-chapter`} className="font-medium text-xs text-[var(--mt-muted)]">
            Capítulo
          </label>
          <select
            id={`${id}-chapter`}
            disabled={disabled || !selectedBook}
            required={required}
            value={selectedChapter ?? ''}
            onChange={(e) => selectChapter(Number(e.target.value))}
            className={SELECT_CLASS}
            aria-label="Capítulo"
          >
            <option value="" disabled>Cap.</option>
            {availableChapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Versículo — modo SINGLE */}
        {selectionMode === 'single' && (
          <div className="flex flex-col gap-1.5 text-sm w-full sm:w-28">
            <label htmlFor={`${id}-verse`} className="font-medium text-xs text-[var(--mt-muted)]">
              Versículo
            </label>
            <select
              id={`${id}-verse`}
              disabled={disabled || !selectedChapter}
              required={required}
              value={selectedVerses[0] ?? ''}
              onChange={(e) => selectVerse(Number(e.target.value))}
              className={SELECT_CLASS}
              aria-label="Versículo"
            >
              <option value="" disabled>Ver.</option>
              {availableVerses.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* Versículos — modo RANGE */}
        {selectionMode === 'range' && (
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1.5 text-sm w-24">
              <label htmlFor={`${id}-range-start`} className="font-medium text-xs text-[var(--mt-muted)]">
                De
              </label>
              <select
                id={`${id}-range-start`}
                disabled={disabled || !selectedChapter}
                value={rangeStart ?? ''}
                onChange={(e) => setRangeStart(Number(e.target.value))}
                className={SELECT_CLASS}
                aria-label="Versículo inicial do intervalo"
              >
                <option value="" disabled>Ver.</option>
                {availableVerses.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-sm w-24">
              <label htmlFor={`${id}-range-end`} className="font-medium text-xs text-[var(--mt-muted)]">
                Até
              </label>
              <select
                id={`${id}-range-end`}
                disabled={disabled || !selectedChapter || rangeStart === null}
                value={rangeEnd ?? ''}
                onChange={(e) => setRangeEnd(Number(e.target.value))}
                className={SELECT_CLASS}
                aria-label="Versículo final do intervalo"
              >
                <option value="" disabled>Ver.</option>
                {availableVerses
                  .filter((v) => rangeStart === null || v >= rangeStart)
                  .map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Checkboxes — modo MÚLTIPLOS */}
      {selectionMode === 'multiple' && selectedChapter && availableVerses.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--mt-muted)]">Selecione os versículos</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Versículos para seleção múltipla">
            {availableVerses.map((v) => {
              const checked = selectedVerses.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  aria-pressed={checked}
                  onClick={() => selectVerse(v)}
                  className={[
                    'h-8 w-8 rounded-lg text-xs font-medium border transition-colors',
                    checked
                      ? 'bg-[var(--mt-navy)] text-white border-[var(--mt-navy)]'
                      : 'border-[var(--mt-border)] text-[var(--mt-muted)] hover:border-[var(--mt-navy)] hover:text-[var(--mt-text)]',
                    disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {v}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview */}
      {output && (
        <p className="text-xs text-[var(--mt-muted)]">
          Referência: <span className="font-semibold text-[var(--mt-text)]">{output}</span>
        </p>
      )}
    </div>
  )
}
