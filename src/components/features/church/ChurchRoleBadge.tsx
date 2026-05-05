interface ChurchRoleBadgeProps {
  role: string
}

export default function ChurchRoleBadge({ role }: ChurchRoleBadgeProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin Global'
      case 'church_admin':
        return 'Admin da Igreja'
      case 'leader':
        return 'Preleitor'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'church_admin':
        return 'bg-blue-100 text-blue-800'
      case 'leader':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
      {getRoleLabel(role)}
    </span>
  )
}