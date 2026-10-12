import { ShieldAlert } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function BuyerAccountDeactivatedBanner() {
  const { user, refreshUser } = useAuth()
  const isBuyer = user?.role === 'buyer'
  const status = user?.status?.toLowerCase()
  // Only show if explicitly deactivated/inactive status. 
  // Don't rely on isActive/is_active booleans which may be unreliable.
  const isDeactivated = status === 'deactivated' || status === 'inactive'

  useEffect(() => {
    if (isBuyer && isDeactivated) {
      refreshUser()
    }
  }, [isBuyer, isDeactivated, refreshUser])

  if (!isBuyer || !isDeactivated) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Account Deactivated</AlertTitle>
      <AlertDescription>
        Your account is currently deactivated. Some features may be restricted until an admin activates your account.
      </AlertDescription>
    </Alert>
  )
}