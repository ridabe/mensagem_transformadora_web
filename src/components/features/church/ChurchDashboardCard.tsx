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
  href,
}: ChurchDashboardCardProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)]"
      style={{ boxShadow: 'var(--mt-shadow-md)' }}
    >
      <div className="p-5">
        <dl>
          <dt className="truncate text-sm font-medium text-[var(--mt-text-secondary)]">
            {title}
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-[var(--mt-text)]">
            {value}
          </dd>
        </dl>
      </div>
      <div className="border-t border-[var(--mt-border)] bg-[var(--mt-surface-muted)] px-5 py-3">
        <Link
          href={href}
          className="text-sm font-medium text-[var(--mt-gold)] transition-colors duration-200 hover:text-[var(--mt-white)]"
        >
          {description}
        </Link>
      </div>
    </div>
  )
}
