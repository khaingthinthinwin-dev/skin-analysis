import { useAuth } from '@/hooks/useAuth'
import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export function DeactivationBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  const status = user?.status?.toLowerCase()
  const isDeactivated = user && (
    user.isActive === false ||
    user.is_active === false ||
    status === 'deactivated' ||
    status === 'inactive'
  )
  const isBuyer = user && user.role === 'buyer'

  if (!isDeactivated || !isBuyer || dismissed) {
    return null
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 border-b border-red-200 bg-red-50 px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"
      role="alert"
    >
      <div className="mx-auto max-w-7xl">
        <Card className="bg-red-50 border border-red-200 rounded-xl shadow-sm">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-700">Account Deactivated</h3>
              <p className="text-sm text-red-700 mt-1">
                Your account is currently deactivated. Some features may be restricted until an admin activates your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}