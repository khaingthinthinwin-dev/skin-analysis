import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  X,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { roleNavConfigs, type UserRole, type NavItem } from '@/lib/navConfig'
import { useAuth } from '@/hooks/useAuth'

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  role?: UserRole
  onLogout?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({
  isOpen,
  onClose,
  role: overrideRole,
  onLogout: overrideLogout,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
}: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, logout: authLogout } = useAuth()

  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = externalIsCollapsed ?? internalCollapsed
  const handleToggleCollapse =
    externalOnToggleCollapse ?? (() => setInternalCollapsed((prev) => !prev))

  const activeRole: UserRole = overrideRole || user?.role || 'buyer'
  const handleLogout = overrideLogout || authLogout
  const config = roleNavConfigs[activeRole] || roleNavConfigs.buyer

  const renderBadge = (item: NavItem) => {
    if (!item.badge) return null

    const variantStyles =
      item.badgeVariant === 'pink'
        ? 'bg-pink-500 text-white shadow-xs animate-pulse'
        : item.badgeVariant === 'amber'
          ? 'bg-amber-500 text-white'
          : 'bg-purple-600 text-white'

    return (
      <span
        className={cn(
          'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
          variantStyles
        )}
      >
        {item.badge}
      </span>
    )
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/80 bg-background/95 backdrop-blur-md transition-all duration-300 ease-in-out lg:static lg:translate-x-0',
        isCollapsed ? 'w-20' : 'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Sidebar Header / Brand Section */}
      <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
        <Link
          to={activeRole === 'admin' || activeRole === 'super_admin' ? '/admin' : activeRole === 'merchant' ? '/merchant' : '/buyer'}
          className="flex items-center gap-3 overflow-hidden"
          onClick={onClose}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md transition-transform hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-base font-extrabold tracking-tight text-foreground">
                Cosmetics Finder
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {config.portalTitle}
                </span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[9px] font-bold border',
                    config.roleBadgeColor
                  )}
                >
                  {config.roleLabel}
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onClose}
          aria-label="Close navigation sidebar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Main Navigation Items */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none"
        aria-label="Sidebar main navigation"
      >
        {config.sections.map((section, idx) => (
          <div key={section.title || idx} className="space-y-1">
            {section.title && (
              <div className="px-3 pb-1">
                {!isCollapsed ? (
                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
                    {section.title}
                  </h2>
                ) : (
                  <div className="h-px bg-border/40 my-2" />
                )}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' &&
                  item.href !== '/buyer' &&
                  item.href !== '/merchant' &&
                  item.href !== '/admin' &&
                  location.pathname.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-purple-100/80 to-purple-50/50 text-purple-900 dark:from-purple-950/60 dark:to-purple-900/30 dark:text-purple-200 border-r-4 border-purple-600 font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-purple-50/50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors duration-200',
                      isActive
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    )}
                  />

                  {!isCollapsed && (
                    <span className="truncate text-sm tracking-tight">
                      {item.label}
                    </span>
                  )}

                  {!isCollapsed && renderBadge(item)}

                  {/* Badge for collapsed mode (small dot highlight) */}
                  {isCollapsed && item.badge && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Desktop Collapse Toggle */}
      <div className="hidden lg:flex items-center justify-end px-3 py-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <>
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>{t('common.collapseSidebar', 'Collapse Sidebar')}</span>
            </>
          )}
        </Button>
      </div>

      {/* Footer User Profile & Logout */}
      <div className="border-t border-border/60 p-3 bg-muted/20">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-bold text-foreground">
                    {user.name || 'User'}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  handleLogout()
                  onClose()
                }}
                className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title={t('common.logout', 'Log out')}
                aria-label={t('common.logout', 'Log out')}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              handleLogout()
              onClose()
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive',
              isCollapsed && 'justify-center'
            )}
            title={t('common.logout', 'Log out')}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t('common.logout', 'Log out')}</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
