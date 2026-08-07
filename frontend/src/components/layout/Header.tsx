import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Menu, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { UserNav } from '@/components/common/UserNav'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'

const navItems = [
  { key: 'home', href: ROUTES.HOME },
  { key: 'products', href: '/products' },
  { key: 'about', href: ROUTES.ABOUT },
]

export function Header() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Cosmetics Finder</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {isAuthenticated ? (
            <UserNav />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to={ROUTES.LOGIN}>{t('common.login')}</Link>
              </Button>
              <Button asChild>
                <Link to={ROUTES.REGISTER}>{t('common.register')}</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="flex flex-col gap-4 mt-8" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.href
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
              <div className="my-4 h-px bg-border" />
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" asChild onClick={() => setOpen(false)}>
                    <Link to={ROUTES.PROFILE}>{t('common.profile')}</Link>
                  </Button>
                  <Button variant="ghost" asChild onClick={() => setOpen(false)}>
                    <Link to={ROUTES.SETTINGS}>{t('common.settings')}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild onClick={() => setOpen(false)}>
                    <Link to={ROUTES.LOGIN}>{t('common.login')}</Link>
                  </Button>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link to={ROUTES.REGISTER}>{t('common.register')}</Link>
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
