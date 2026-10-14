import { ShieldAlert } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useTranslation } from 'react-i18next'

interface AccountDeactivatedBannerProps {
  className?: string
}

export function AccountDeactivatedBanner({ className }: AccountDeactivatedBannerProps) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive" className={className}>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{t('merchant.account.deactivatedTitle')}</AlertTitle>
      <AlertDescription>
        {t('merchant.account.deactivated')}
      </AlertDescription>
    </Alert>
  )
}
