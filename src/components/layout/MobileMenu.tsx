'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MobileMenuProps {
  isLoggedIn: boolean
  areaHref: string
  playStoreUrl: string
  logoutSlot?: React.ReactNode
}

export function MobileMenu({ isLoggedIn, areaHref, playStoreUrl, logoutSlot }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <div className="relative">
      <button
        className="btn btn-ghost btn-sm inline-flex"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={close} />
          <div
            className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)]"
            style={{ boxShadow: 'var(--mt-shadow-xl)' }}
          >
            <nav className="flex flex-col p-2">
              <Link href="/" onClick={close} className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5">
                Home
              </Link>
              <Link href="/mensagens" onClick={close} className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5">
                Mensagens
              </Link>
              {isLoggedIn ? (
                <>
                  <Link href={areaHref} onClick={close} className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5">
                    Minha área
                  </Link>
                  {logoutSlot}
                </>
              ) : (
                <>
                  <Link href="/login" onClick={close} className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5">
                    Entrar
                  </Link>
                  <Link href="/cadastro" onClick={close} className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5">
                    Cadastro
                  </Link>
                </>
              )}
              <Link href="/sobre" onClick={close} className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-text)] transition-colors hover:bg-white/5">
                Sobre
              </Link>
              <div className="mx-4 my-1 border-t border-[var(--mt-border)]" />
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noreferrer"
                onClick={close}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--mt-gold)] transition-colors hover:bg-white/5"
              >
                Baixar App
              </a>
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
