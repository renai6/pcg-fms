'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/vehicles', label: 'Vehicles' },
  { href: '/admin/trips', label: 'Trips' },
  { href: '/admin/personnel', label: 'Personnel' },
]

interface SidebarProps {
  userName: string
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r bg-sidebar min-h-screen">
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground">PCG Facility Management</p>
        <p className="text-sm font-medium truncate mt-0.5">{userName}</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
