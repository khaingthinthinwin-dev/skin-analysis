import { Header } from '@/components/layout/Header'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header bar — same as public pages */}
      <Header />

      {/* Centered form content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  )
}
