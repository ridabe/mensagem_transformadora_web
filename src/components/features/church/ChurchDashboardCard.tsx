import Link from 'next/link'

interface ChurchDashboardCardProps {
  title: string
  value: string | number
  description: string
  href: string
}

export default function ChurchDashboardCard({
  title,
  value,
  description,
  href
}: ChurchDashboardCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <Link
            href={href}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {description}
          </Link>
        </div>
      </div>
    </div>
  )
}