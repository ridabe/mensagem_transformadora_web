import Image from "next/image";
import Link from "next/link";

import logo from "../../../img/logo.png";
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
          <Image
            src={logo}
            alt="Mensagem Transformadora"
            width={170}
            priority
          />
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

