import { ShieldAlert } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface AccountDeactivatedBannerProps {
  className?: string
}

export function AccountDeactivatedBanner({ className }: AccountDeactivatedBannerProps) {
  return (
    <Alert variant="destructive" className={className}>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Account Deactivate</AlertTitle>
      <AlertDescription>
        Your merchant account is currently Deactivate. Some features may be restricted until an admin activates your account.
      </AlertDescription>
    </Alert>
  )
}
