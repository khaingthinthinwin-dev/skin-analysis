import { useRouteError, useNavigate } from 'react-router'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export function MerchantErrorBoundary() {
  const { t } = useTranslation()
  const error = useRouteError()
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-foreground">{t('merchant.errorBoundary.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : t('merchant.errorBoundary.unexpected')}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/merchant/products')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('merchant.errorBoundary.backToDashboard')}
            </Button>
            <Button onClick={() => window.location.reload()}>{t('common.actions.retry')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
