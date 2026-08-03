import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { X, User, Settings, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const sidebarItems = [
  { key: 'dashboard', icon: LayoutDashboard, href: ROUTES.DASHBOARD },
  { key: 'profile', icon: User, href: ROUTES.PROFILE },
  { key: 'settings', icon: Settings, href: ROUTES.SETTINGS },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform lg:static lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link to={ROUTES.HOME} className="font-bold text-lg">
          SkincareAI
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex flex-col gap-1 p-4" aria-label="Dashboard navigation">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.key}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`nav.${item.key}`)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
