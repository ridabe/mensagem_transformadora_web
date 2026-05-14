import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mensagem Transformadora — Pregação para Pastores e Líderes",
    template: "%s — Mensagem Transformadora",
  },
  description:
    "Plataforma para pastores e líderes organizarem pregação, anotações e mensagens da Palavra de Deus. Escreva, revise e publique sua mensagem com total controle.",
  keywords: ["pregação", "mensagem", "pastor", "líder", "anotação", "palavra", "sermão"],
  verification: {
    google: "4cdSQFaT-UgZAzwCPyrTEszl1rTD5wZLlRTUDaQd4vA",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
