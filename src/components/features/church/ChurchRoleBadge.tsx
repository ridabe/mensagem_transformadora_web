interface ChurchRoleBadgeProps {
  role: string
}

export default function ChurchRoleBadge({ role }: ChurchRoleBadgeProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin Global'
      case 'church_admin': return 'Admin da Igreja'
      case 'leader': return 'Preleitor'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[var(--mt-error-bg)] text-[var(--mt-error)] border border-[var(--mt-error-border)]'
      case 'church_admin':
        return 'bg-[var(--mt-info-bg)] text-[var(--mt-info)] border border-[var(--mt-info-border)]'
      case 'leader':
        return 'bg-[var(--mt-success-bg)] text-[var(--mt-success)] border border-[var(--mt-success-border)]'
      default:
        return 'border border-[var(--mt-border)] text-[var(--mt-text-secondary)]'
    }
  }

  return (
    <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(role)}`}>
      {getRoleLabel(role)}
    </span>
  )
}
