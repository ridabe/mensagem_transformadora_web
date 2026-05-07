'use client'

import { useState, useMemo, useCallback } from 'react'
import bibleData from '@/data/bible-structure.json'

export interface BibleBook {
  id: number
  name: string
  abbrev: string
  testament: 'AT' | 'NT'
  chapters: number[]
}

export type SelectionMode = 'single' | 'range' | 'multiple'

export interface BibleSelectorState {
  selectedBook: BibleBook | null
  selectedChapter: number | null
  selectionMode: SelectionMode
  selectedVerses: number[]
  rangeStart: number | null
  rangeEnd: number | null
  availableChapters: number[]
  availableVerses: number[]
  output: string
}

export interface UseBibleSelectorReturn extends BibleSelectorState {
  books: BibleBook[]
  selectBook: (bookId: number) => void
  selectChapter: (chapter: number) => void
  selectVerse: (verse: number) => void
  setSelectionMode: (mode: SelectionMode) => void
  setRangeStart: (verse: number) => void
  setRangeEnd: (verse: number) => void
  reset: () => void
  loadFromString: (verseRef: string) => void
}

const ALL_BOOKS: BibleBook[] = bibleData.books as BibleBook[]

function buildOutput(
  book: BibleBook | null,
  chapter: number | null,
  mode: SelectionMode,
  selectedVerses: number[],
  rangeStart: number | null,
  rangeEnd: number | null,
): string {
  if (!book || !chapter) return ''

  const prefix = `${book.name} ${chapter}:`

  if (mode === 'single') {
    if (selectedVerses.length === 0) return ''
    return `${prefix}${selectedVerses[0]}`
  }

  if (mode === 'range') {
    if (rangeStart === null || rangeEnd === null) return ''
    const start = Math.min(rangeStart, rangeEnd)
    const end = Math.max(rangeStart, rangeEnd)
    if (start === end) return `${prefix}${start}`
    return `${prefix}${start}-${end}`
  }

  // multiple
  if (selectedVerses.length === 0) return ''
  const sorted = [...selectedVerses].sort((a, b) => a - b)
  return `${prefix}${sorted.join(',')}`
}

// Parser reverso: "João 3:16" | "João 3:16-18" | "João 3:16,18,20"
function parseVerseString(ref: string): {
  book: BibleBook
  chapter: number
  mode: SelectionMode
  verses: number[]
  rangeStart: number | null
  rangeEnd: number | null
} | null {
  if (!ref || !ref.trim()) return null

  // Formato esperado: "Nome do Livro Cap:versiculos"
  const match = ref.trim().match(/^(.+?)\s+(\d+):(.+)$/)
  if (!match) return null

  const [, bookName, chapterStr, versePart] = match
  const chapter = parseInt(chapterStr, 10)

  const book = ALL_BOOKS.find(
    (b) => b.name.toLowerCase() === bookName.trim().toLowerCase() ||
           b.abbrev.toLowerCase() === bookName.trim().toLowerCase()
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
    return { book, chapter, mode: 'range', verses: [], rangeStart: start, rangeEnd: end }
  }

  // Múltiplos: "16,18,20"
  if (versePart.includes(',')) {
    const verses = versePart.split(',').map((v) => parseInt(v.trim(), 10))
    if (verses.some((v) => isNaN(v) || v < 1 || v > maxVerse)) return null
    return { book, chapter, mode: 'multiple', verses, rangeStart: null, rangeEnd: null }
  }

  // Único: "16"
  const single = parseInt(versePart.trim(), 10)
  if (isNaN(single) || single < 1 || single > maxVerse) return null
  return { book, chapter, mode: 'single', verses: [single], rangeStart: null, rangeEnd: null }
}

export function useBibleSelector(initialValue?: string): UseBibleSelectorReturn {
  const getInitialState = () => {
    if (initialValue) {
      const parsed = parseVerseString(initialValue)
      if (parsed) {
        return {
          selectedBook: parsed.book,
          selectedChapter: parsed.chapter,
          selectionMode: parsed.mode as SelectionMode,
          selectedVerses: parsed.verses,
          rangeStart: parsed.rangeStart,
          rangeEnd: parsed.rangeEnd,
        }
      }
    }
    return {
      selectedBook: null,
      selectedChapter: null,
      selectionMode: 'single' as SelectionMode,
      selectedVerses: [],
      rangeStart: null,
      rangeEnd: null,
    }
  }

  const initial = getInitialState()

  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(initial.selectedBook)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initial.selectedChapter)
  const [selectionMode, setSelectionModeState] = useState<SelectionMode>(initial.selectionMode)
  const [selectedVerses, setSelectedVerses] = useState<number[]>(initial.selectedVerses)
  const [rangeStart, setRangeStartState] = useState<number | null>(initial.rangeStart)
  const [rangeEnd, setRangeEndState] = useState<number | null>(initial.rangeEnd)

  const availableChapters = useMemo<number[]>(() => {
    if (!selectedBook) return []
    return Array.from({ length: selectedBook.chapters.length }, (_, i) => i + 1)
  }, [selectedBook])

  const availableVerses = useMemo<number[]>(() => {
    if (!selectedBook || !selectedChapter) return []
    const count = selectedBook.chapters[selectedChapter - 1]
    return Array.from({ length: count }, (_, i) => i + 1)
  }, [selectedBook, selectedChapter])

  const output = useMemo<string>(() => {
    return buildOutput(selectedBook, selectedChapter, selectionMode, selectedVerses, rangeStart, rangeEnd)
  }, [selectedBook, selectedChapter, selectionMode, selectedVerses, rangeStart, rangeEnd])

  const selectBook = useCallback((bookId: number) => {
    const book = ALL_BOOKS.find((b) => b.id === bookId) ?? null
    setSelectedBook(book)
    setSelectedChapter(null)
    setSelectedVerses([])
    setRangeStartState(null)
    setRangeEndState(null)
  }, [])

  const selectChapter = useCallback((chapter: number) => {
    setSelectedChapter(chapter)
    setSelectedVerses([])
    setRangeStartState(null)
    setRangeEndState(null)
  }, [])

  const selectVerse = useCallback((verse: number) => {
    if (selectionMode === 'single') {
      setSelectedVerses([verse])
    } else if (selectionMode === 'multiple') {
      setSelectedVerses((prev) =>
        prev.includes(verse) ? prev.filter((v) => v !== verse) : [...prev, verse]
      )
    }
  }, [selectionMode])

  const setSelectionMode = useCallback((mode: SelectionMode) => {
    setSelectionModeState(mode)
    setSelectedVerses([])
    setRangeStartState(null)
    setRangeEndState(null)
  }, [])

  const setRangeStart = useCallback((verse: number) => {
    setRangeStartState(verse)
  }, [])

  const setRangeEnd = useCallback((verse: number) => {
    setRangeEndState(verse)
  }, [])

  const reset = useCallback(() => {
    setSelectedBook(null)
    setSelectedChapter(null)
    setSelectionModeState('single')
    setSelectedVerses([])
    setRangeStartState(null)
    setRangeEndState(null)
  }, [])

  const loadFromString = useCallback((verseRef: string) => {
    const parsed = parseVerseString(verseRef)
    if (!parsed) return
    setSelectedBook(parsed.book)
    setSelectedChapter(parsed.chapter)
    setSelectionModeState(parsed.mode)
    setSelectedVerses(parsed.verses)
    setRangeStartState(parsed.rangeStart)
    setRangeEndState(parsed.rangeEnd)
  }, [])

  return {
    books: ALL_BOOKS,
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
    reset,
    loadFromString,
  }
}
