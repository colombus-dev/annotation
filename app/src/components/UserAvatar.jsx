import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const ROLE_LABELS = { admin: 'Administrator', member: 'Annotator' }

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role
}

function initialsOf(label) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserAvatar({ user, size = 'default', className, ...props }) {
  const label = user?.name || user?.username || ''
  const isAdmin = user?.role === 'admin'

  return (
    <Avatar
      className={cn(
        'ring-2',
        isAdmin ? 'ring-primary' : 'ring-muted-foreground/40',
        size === 'lg' && 'size-12 text-base',
        className
      )}
      {...props}
    >
      <AvatarFallback>{initialsOf(label)}</AvatarFallback>
    </Avatar>
  );
}
