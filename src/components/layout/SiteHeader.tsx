import Image from "next/image";
import Link from "next/link";

import { getCurrentProfile } from "@/lib/auth/profiles";
import { logout as leaderLogout } from "@/app/login/actions";
import { logout as adminLogout } from "@/app/admin/login/actions";

const PLAY_STORE_URL =
  "https://play.google.com/store/search?q=mensagem%20transformadora&c=apps";

export async function SiteHeader() {
  const profile = await getCurrentProfile().catch(() => null);
  const isLoggedIn = !!profile && profile.status !== "blocked";
  const isAdmin = isLoggedIn && profile.role === "admin";

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--mt-border)] bg-[var(--mt-surface)]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <svg
            viewBox="0 0 1200 400"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-auto"
          >
            {/* Ícone: Livro com Cruz e Lápis */}
            <g id="book-icon">
              {/* Livro aberto */}
              <g id="book">
                {/* Capa traseira direita */}
                <path
                  d="M 180 120 Q 190 110 200 120 L 200 280 Q 190 290 180 280 Z"
                  fill="#1A4D8C"
                  stroke="#0D182A"
                  strokeWidth="3"
                />

                {/* Páginas */}
                <path
                  d="M 200 120 L 380 120 Q 390 110 400 120 L 400 280 Q 390 290 380 280 L 200 280 Z"
                  fill="#FFF8E7"
                  stroke="#F5C842"
                  strokeWidth="2"
                />

                {/* Linhas das páginas */}
                <line
                  x1="220"
                  y1="150"
                  x2="360"
                  y2="150"
                  stroke="#F5C842"
                  strokeWidth="2"
                  opacity="0.6"
                />
                <line
                  x1="220"
                  y1="180"
                  x2="360"
                  y2="180"
                  stroke="#F5C842"
                  strokeWidth="2"
                  opacity="0.6"
                />
                <line
                  x1="220"
                  y1="210"
                  x2="360"
                  y2="210"
                  stroke="#F5C842"
                  strokeWidth="2"
                  opacity="0.6"
                />
                <line
                  x1="220"
                  y1="240"
                  x2="360"
                  y2="240"
                  stroke="#F5C842"
                  strokeWidth="2"
                  opacity="0.6"
                />

                {/* Capa dianteira esquerda */}
                <path
                  d="M 200 120 L 200 280 L 180 280 Q 170 290 160 280 L 160 120 Q 170 110 180 120 Z"
                  fill="#0D182A"
                  stroke="#0D182A"
                  strokeWidth="2"
                  opacity="0.3"
                />

                {/* Fita de marcador vermelho */}
                <rect x="160" y="280" width="12" height="80" fill="#E53E3E" rx="2" />
              </g>

              {/* Cruz dourada */}
              <g id="cross" transform="translate(320, 100)">
                <rect
                  x="-8"
                  y="-30"
                  width="16"
                  height="60"
                  fill="#F5C842"
                  rx="2"
                />
                <rect
                  x="-30"
                  y="-8"
                  width="60"
                  height="16"
                  fill="#F5C842"
                  rx="2"
                />
                {/* Brilho */}
                <circle cx="-5" cy="-15" r="4" fill="#FFFFFF" opacity="0.6" />
              </g>

              {/* Lápis azul */}
              <g id="pencil" transform="translate(280, 140) rotate(25)">
                {/* Corpo */}
                <rect
                  x="-8"
                  y="-60"
                  width="16"
                  height="80"
                  fill="#2563EB"
                  rx="2"
                />
                {/* Ponta ouro */}
                <circle cx="0" cy="-65" r="6" fill="#F5C842" />
                <polygon points="0,-65 -5,-52 5,-52" fill="#F5C842" />
                {/* Borracha */}
                <rect x="-6" y="16" width="12" height="10" fill="#E53E3E" rx="1" />
                {/* Ferragem */}
                <rect x="-7" y="10" width="14" height="4" fill="#C9A227" rx="1" />
              </g>

              {/* Estrelas decorativas */}
              <g id="stars" opacity="0.8">
                <polygon
                  points="280,80 285,95 301,95 289,105 294,120 280,110 266,120 271,105 259,95 275,95"
                  fill="#F5C842"
                />
                <polygon
                  points="150,140 152,148 161,148 154,153 156,161 150,156 144,161 146,153 139,148 148,148"
                  fill="#F5C842"
                />
                <polygon
                  points="420,160 422,168 431,168 424,173 426,181 420,176 414,181 416,173 409,168 418,168"
                  fill="#F5C842"
                />
                <polygon
                  points="420,100 421,105 427,105 422,109 423,114 420,110 417,114 418,109 413,105 419,105"
                  fill="#F5C842"
                />
              </g>
            </g>

            {/* Texto "Mensagem Transformadora" */}
            <g id="text">
              {/* "Mensagem" em azul navy */}
              <text
                x="480"
                y="200"
                fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                fontSize="72"
                fontWeight="700"
                fill="#1A2744"
                letterSpacing="-1"
              >
                Mensagem
              </text>

              {/* "Transformadora" em dourado */}
              <text
                x="480"
                y="280"
                fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                fontSize="72"
                fontWeight="700"
                fill="#F5C842"
                letterSpacing="-1"
              >
                Transformadora
              </text>
            </g>
          </svg>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--mt-muted)] md:flex">
          <Link href="/mensagens" className="hover:text-[var(--mt-text)]">
            Mensagens
          </Link>
          <Link href="/sobre" className="hover:text-[var(--mt-text)]">
            Sobre
          </Link>
          {isLoggedIn ? (
            <Link
              href={isAdmin ? "/admin/dashboard" : "/lider/sermoes"}
              className="hover:text-[var(--mt-text)]"
            >
              Minha área
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-[var(--mt-text)]">
                Entrar
              </Link>
              <Link href="/cadastro" className="hover:text-[var(--mt-text)]">
                Cadastro
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                href={isAdmin ? "/admin/dashboard" : "/lider/sermoes"}
                className="hidden h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-medium text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5 md:inline-flex"
              >
                Minha área
              </Link>
              {isAdmin ? (
                <form action={adminLogout} className="hidden md:block">
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-medium text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Sair
                  </button>
                </form>
              ) : (
                <form action={leaderLogout} className="hidden md:block">
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-medium text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Sair
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-medium text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5 md:inline-flex"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="hidden h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-medium text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5 md:inline-flex"
              >
                Cadastro
              </Link>
            </>
          )}
          <Link
            href="/mensagens"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-medium text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            Ver mensagens
          </Link>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--mt-navy)] px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Baixar App
          </a>
        </div>
      </div>
    </header>
  );
}

