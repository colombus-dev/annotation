import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Navbar } from '@/components/Navbar'
import { cn } from '@/lib/utils'

export function Layout({ user, authRequired, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen">
      <aside
        className={cn(
          'flex-shrink-0 border-r border-border bg-popover transition-all',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <Navbar
          user={user}
          authRequired={authRequired}
          onLogout={onLogout}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
