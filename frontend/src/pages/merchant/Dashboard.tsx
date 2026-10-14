import { Link } from 'react-router'
import { Package, Tag, Megaphone, TrendingUp, Plus, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AccountDeactivatedBanner } from '@/components/merchant/AccountDeactivatedBanner'
import { useAuth } from '@/hooks/useAuth'

export default function MerchantDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isDeactivated =
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive'
  const licenseStatus = user?.licenseStatus || user?.license_status
  const isPending = licenseStatus === 'pending'
  const isRejected = licenseStatus === 'rejected'
  const canManageCatalog = !isDeactivated && !isPending && !isRejected

  const stats = [
    { label: t('merchant.dashboard.stats.totalProducts'), value: '24', change: t('merchant.dashboard.stats.totalProductsChange'), icon: Package, color: 'text-purple-600' },
    { label: t('merchant.dashboard.stats.activePromotions'), value: '5', change: t('merchant.dashboard.stats.activePromotionsChange'), icon: Tag, color: 'text-pink-600' },
    { label: t('merchant.dashboard.stats.runningAds'), value: '2', change: t('merchant.dashboard.stats.runningAdsChange'), icon: Megaphone, color: 'text-amber-600' },
    { label: t('merchant.dashboard.stats.orderInsights'), value: '142', change: t('merchant.dashboard.stats.orderInsightsChange'), icon: TrendingUp, color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-700 p-6 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <span>{t('merchant.dashboard.portal')}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            {t('merchant.dashboard.welcome', { name: user?.name || t('merchant.dashboard.defaultName') })}
          </h1>
          <p className="text-sm text-purple-100/80">
            {t('merchant.dashboard.subtitle')}
          </p>
        </div>
        {canManageCatalog && (
          <Button asChild size="lg" className="bg-white text-purple-900 hover:bg-purple-50 font-bold shrink-0 shadow-md">
            <Link to="/merchant/products">
              <Plus className="mr-2 h-4 w-4" /> {t('merchant.dashboard.addProduct')}
            </Link>
          </Button>
        )}
      </div>

      {/* Deactivated Warning */}
      {isDeactivated && <AccountDeactivatedBanner />}

      {/* Pending Approval Warning */}
      {!isDeactivated && isPending && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('merchant.dashboard.pendingTitle')}</AlertTitle>
          <AlertDescription>
            {t('merchant.dashboard.pendingDescription')}
          </AlertDescription>
        </Alert>
      )}

      {/* Rejected Warning */}
      {!isDeactivated && isRejected && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>{t('merchant.dashboard.rejectedTitle')}</AlertTitle>
          <AlertDescription>
            {t('merchant.dashboard.rejectedDescription')}{' '}
            <Link to="/merchant/profile" className="underline font-semibold">
              {t('merchant.dashboard.goToProfile')}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border/80 shadow-xs transition-transform hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.label}</CardTitle>
                <div className={`p-2 rounded-xl bg-muted/60 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('merchant.dashboard.catalogTitle')}</CardTitle>
                <CardDescription>{t('merchant.dashboard.catalogDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              {t('merchant.dashboard.catalogHelp')}
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/merchant/products">
                {t('merchant.dashboard.manageProducts')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('merchant.dashboard.promotionsTitle')}</CardTitle>
                <CardDescription>{t('merchant.dashboard.promotionsDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              {t('merchant.dashboard.promotionsHelp')}
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/merchant/promotions">
                {t('merchant.dashboard.managePromotions')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('merchant.dashboard.adsTitle')}</CardTitle>
                <CardDescription>{t('merchant.dashboard.adsDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              {t('merchant.dashboard.adsHelp')}
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/merchant/advertisements">
                {t('merchant.dashboard.manageAds')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
