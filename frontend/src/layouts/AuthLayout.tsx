import { Sparkles } from 'lucide-react'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { APP_NAME } from '@/lib/constants'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header with Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{APP_NAME}</span>
          </div>
        </div>

        {/* Content */}
        {children}

        {/* Footer Controls */}
        <div className="flex items-center justify-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
