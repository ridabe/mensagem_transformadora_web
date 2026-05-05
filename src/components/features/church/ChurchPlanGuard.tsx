import { ReactNode, useEffect, useState } from 'react'
import { ChurchService } from '@/lib/church'
import BusinessInactiveWarning from './BusinessInactiveWarning'

interface ChurchPlanGuardProps {
  children: ReactNode
}

export default function ChurchPlanGuard({ children }: ChurchPlanGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      const churchService = new ChurchService()
      try {
        await churchService.assertChurchAdmin()
        setHasAccess(true)
      } catch {
        setHasAccess(false)
      }
    }

    checkAccess()
  }, [])

  if (hasAccess === null) {
    return <div>Carregando...</div>
  }

  if (!hasAccess) {
    return <BusinessInactiveWarning />
  }

  return <>{children}</>
}