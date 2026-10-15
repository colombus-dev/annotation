import {
  CodeIcon,
  HistoryIcon,
  LogOutIcon,
  MoonIcon,
  MoreVerticalIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { UserAvatar, roleLabel } from '@/components/UserAvatar'
import { APP_NAME } from '@/constants'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes'

const NAV_ITEMS = [
  { to: ROUTES.HOME, label: 'Workspace', icon: CodeIcon, adminOnly: false },
  { to: ROUTES.TEAM, label: 'Team', icon: UsersIcon, adminOnly: true },
  { to: ROUTES.ACTIVITY, label: 'Activity History', icon: HistoryIcon, adminOnly: true },
]

export function Navbar({ user, authRequired, onLogout }) {
  const isAdmin = user?.role === 'admin'
  const [theme, setTheme] = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex h-full w-64 flex-col gap-6 p-4">
      <div className="px-1">
        <span className="text-lg font-semibold tracking-tight text-primary">
          {APP_NAME}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.HOME}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                isActive && 'bg-muted text-foreground'
              )
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <Popover>
          <PopoverTrigger className="flex items-center gap-2 rounded-md p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            <UserAvatar user={user} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {user.name || user.username}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {roleLabel(user.role)}
              </span>
            </div>
            <MoreVerticalIcon size={16} className="shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent side="right" align="end">
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
              {isDark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
              <span className="flex-1">Dark mode</span>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                aria-label="Toggle dark mode" />
            </div>
            {authRequired && (
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <LogOutIcon size={14} />
                Sign out
              </button>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
