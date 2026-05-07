'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export function AccessDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [isOpen])

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        className="btn btn-ghost btn-sm inline-flex gap-1.5"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Acessar
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)]"
          style={{ boxShadow: 'var(--mt-shadow-xl)' }}
          role="menu"
        >
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5"
            role="menuitem"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5"
            role="menuitem"
          >
            Cadastro
          </Link>
        </div>
      )}
    </div>
  )
}
