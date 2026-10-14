import { ShieldAlert, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AccountDeactivatedAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the user tried to do, e.g. "reviews" or "skin analysis" */
  feature?: string
}

export function AccountDeactivatedAlertDialog({
  open,
  onOpenChange,
  feature = 'this feature',
}: AccountDeactivatedAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogClose
          aria-label="Close"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </AlertDialogClose>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Account Deactivated
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your account is currently deactivated. You cannot create new {feature} until an
            administrator reactivates your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
