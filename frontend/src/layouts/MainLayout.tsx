import { Outlet } from 'react-router'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'

export function MainLayout() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2"
      >
        Skip to main content
      </a>
      {!isAuthenticated && <Header />}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      {!isAuthenticated && <Footer />}
    </div>
  )
}
