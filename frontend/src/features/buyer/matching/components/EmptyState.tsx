import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  message?: string
}

export function EmptyState({ message }: EmptyStateProps) {
  const { t } = useTranslation('skin')
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground max-w-sm">
        {message ?? t('matchingPage.emptyState')}
      </p>
    </div>
  )
}
