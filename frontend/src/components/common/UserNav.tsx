import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LogOut, User, Settings, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES, getDashboardRoute } from '@/lib/constants'

export function UserNav() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  if (!user) return null

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email.charAt(0).toUpperCase()

  const handleLogout = () => {
    logout()
    window.location.href = ROUTES.HOME
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center gap-2 p-2">
          <p className="text-sm font-medium">{user.name || user.email}</p>
          <span className="ml-auto rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">
            {user.role}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={getDashboardRoute(user.role)} className="flex items-center gap-2 font-semibold text-primary">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={ROUTES.PROFILE} className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('common.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={ROUTES.SETTINGS} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('common.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
