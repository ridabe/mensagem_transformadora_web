import type { BibleBook, SelectionMode } from './useBibleSelector'
import bibleData from '@/data/bible-structure.json'

export interface ParsedVerseReference {
  bookName: string
  chapter: number
  verses: number[]
  mode: SelectionMode
}

const ALL_BOOKS: BibleBook[] = bibleData.books as BibleBook[]

/**
 * Gera string de referência bíblica a partir dos componentes selecionados.
 *
 * Exemplos:
 *   formatVerseReference("João", 3, [16], "single")       → "João 3:16"
 *   formatVerseReference("João", 3, [16,17,18], "range")  → "João 3:16-18"
 *   formatVerseReference("João", 3, [16,18,20], "multiple")→ "João 3:16,18,20"
 */
export function formatVerseReference(
  bookName: string,
  chapter: number,
  verses: number[],
  mode: SelectionMode,
): string {
  if (!bookName || !chapter || verses.length === 0) return ''

  const prefix = `${bookName} ${chapter}:`

  if (mode === 'single') {
    return `${prefix}${verses[0]}`
  }

  if (mode === 'range') {
    const sorted = [...verses].sort((a, b) => a - b)
    if (sorted.length === 1) return `${prefix}${sorted[0]}`
    return `${prefix}${sorted[0]}-${sorted[sorted.length - 1]}`
  }

  // multiple
  const sorted = [...verses].sort((a, b) => a - b)
  return `${prefix}${sorted.join(',')}`
}

/**
 * Converte string de referência bíblica em objeto estruturado.
 * Retorna null se a referência for inválida ou não reconhecida.
 *
 * Exemplos:
 *   parseVerseReference("João 3:16")       → { bookName: "João", chapter: 3, verses: [16], mode: "single" }
 *   parseVerseReference("João 3:16-18")    → { bookName: "João", chapter: 3, verses: [16,17,18], mode: "range" }
 *   parseVerseReference("João 3:16,18,20") → { bookName: "João", chapter: 3, verses: [16,18,20], mode: "multiple" }
 *   parseVerseReference("texto inválido")  → null
 */
export function parseVerseReference(ref: string): ParsedVerseReference | null {
  if (!ref?.trim()) return null

  const match = ref.trim().match(/^(.+?)\s+(\d+):(.+)$/)
  if (!match) return null

  const [, rawBookName, chapterStr, versePart] = match
  const chapter = parseInt(chapterStr, 10)

  const book = ALL_BOOKS.find(
    (b) =>
      b.name.toLowerCase() === rawBookName.trim().toLowerCase() ||
      b.abbrev.toLowerCase() === rawBookName.trim().toLowerCase(),
  )
  if (!book) return null
  if (chapter < 1 || chapter > book.chapters.length) return null

  const maxVerse = book.chapters[chapter - 1]

  // Range: "16-18"
  const rangeMatch = versePart.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    if (start < 1 || end > maxVerse || start > end) return null
    const verses = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    return { bookName: book.name, chapter, verses, mode: 'range' }
  }

  // Múltiplos: "16,18,20"
  if (versePart.includes(',')) {
    const verses = versePart.split(',').map((v) => parseInt(v.trim(), 10))
    if (verses.some((v) => isNaN(v) || v < 1 || v > maxVerse)) return null
    return { bookName: book.name, chapter, verses, mode: 'multiple' }
  }

  // Único: "16"
  const single = parseInt(versePart.trim(), 10)
  if (isNaN(single) || single < 1 || single > maxVerse) return null
  return { bookName: book.name, chapter, verses: [single], mode: 'single' }
}

/**
 * Normaliza um nome ou abreviação de livro para o nome canônico PT-BR.
 * Retorna null se não encontrar correspondência.
 *
 * Exemplos:
 *   normalizeBookName("Jo")    → "João"
 *   normalizeBookName("joão")  → "João"
 *   normalizeBookName("Gn")    → "Gênesis"
 *   normalizeBookName("xyz")   → null
 */
export function normalizeBookName(input: string): string | null {
  if (!input?.trim()) return null

  const normalized = input.trim().toLowerCase()
  const book = ALL_BOOKS.find(
    (b) =>
      b.name.toLowerCase() === normalized ||
      b.abbrev.toLowerCase() === normalized,
  )

  return book?.name ?? null
}
