import { ReactNode } from 'react'
import Link from 'next/link'
import { ChurchService } from '@/lib/church'
import { redirect } from 'next/navigation'

interface ChurchAreaLayoutProps {
  children: ReactNode
}

export default async function ChurchAreaLayout({ children }: ChurchAreaLayoutProps) {
  const churchService = new ChurchService()
  let churchName = 'Igreja'
  try {
    const { church } = await churchService.assertChurchAdmin()
    churchName = church?.name?.trim() ? church.name.trim() : 'Igreja'
  } catch {
    redirect('/lider/sermoes')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/igreja" className="text-xl font-bold text-gray-900">
                Área da Igreja • {churchName}
              </Link>
            </div>
            <nav className="flex space-x-8">
              <Link
                href="/igreja/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/igreja/preleitores"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Preleitores
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
