import { Outlet } from 'react-router-dom'

import { Navbar } from '@/components/Navbar'

export function Layout({ user, authRequired, onLogout }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-popover">
        <Navbar user={user} authRequired={authRequired} onLogout={onLogout} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
