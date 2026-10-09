import { useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Tag, Plus, Search, Filter, Trash2, Pencil, ShieldAlert, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useTranslation } from 'react-i18next'
import { usePromotions, useDeletePromotion, useTogglePromotionActive, getPromotionErrorInfo } from '@/hooks/usePromotions'
import { useAuth } from '@/hooks/useAuth'
import { useMerchantProductsGuard } from '@/features/merchant/products/guards/merchantProducts.guard'
import { AccountDeactivatedBanner } from '@/components/merchant/AccountDeactivatedBanner'
import { PaginationControls } from '@/components/PaginationControls'
import type { PromotionQueryParams, Promotion } from '@/types/promotion.types'

export default function Promotions() {
  const { t } = useTranslation('promotions')
  const { user } = useAuth()
  const guard = useMerchantProductsGuard()
  const status = user?.licenseStatus || user?.license_status
  const isPending = guard.isPending || status === 'pending'
  const isDeactivated =
    guard.isDeactivated ||
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive'
  const showPendingBanner = (guard.showPendingBanner || isPending) && !isDeactivated
  const showDeactivatedBanner = guard.showDeactivatedBanner || isDeactivated
  const showCrudActions = guard.showCrudActions && !isPending && !isDeactivated

  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PromotionQueryParams['status']>('all')
  const [sortBy, setSortBy] = useState<PromotionQueryParams['sortBy']>('newest')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const queryParams: PromotionQueryParams = {
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy,
    page,
    limit,
  }

  const { data, isLoading, error } = usePromotions(queryParams)
  const deletePromotion = useDeletePromotion()
  const toggleActive = useTogglePromotionActive()

  const promotions = useMemo<Promotion[]>(() => data?.items || [], [data?.items])
  const meta = data?.meta

  const now = useMemo(() => new Date(), [])

  const getStatusBadge = useCallback(
    (promo: Promotion) => {
      if (promo.expiresAt && new Date(promo.expiresAt) < now) {
        return <Badge className="bg-red-100 text-red-800">{t('merchant.promotions.statusExpired')}</Badge>
      }
      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return <Badge className="bg-orange-100 text-orange-800">{t('merchant.promotions.statusExhausted')}</Badge>
      }
      if (promo.isActive) {
        return <Badge className="bg-green-100 text-green-800">{t('merchant.promotions.statusActive')}</Badge>
      }
      return <Badge className="bg-gray-100 text-gray-800">{t('merchant.promotions.statusInactive')}</Badge>
    },
    [now, t],
  )

  const handleDelete = useCallback(
    (id: string) => {
      deletePromotion.mutate(id, {
        onSuccess: () => {
          toast.success(t('merchant.promotions.deleteSuccess'))
          setDeleteId(null)
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
          const backendMessage = axiosErr?.response?.data?.message
          toast.error(backendMessage ? String(backendMessage) : t('merchant.promotions.notFound'))
        },
      })
    },
    [deletePromotion, t],
  )

  const handleToggleActive = useCallback(
    (id: string) => {
      toggleActive.mutate(id, {
        onSuccess: () => toast.success(t('merchant.promotions.toggleSuccess')),
        onError: () => toast.error('Failed to update status'),
      })
    },
    [toggleActive, t],
  )

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  const formatUsage = useCallback((promo: Promotion) => {
    if (!promo.maxUses) return `${promo.usedCount} / ${t('merchant.promotions.unlimited')}`
    return `${promo.usedCount} / ${promo.maxUses}`
  }, [t])

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  const isExpired = useCallback(
    (promo: Promotion) => promo.expiresAt && new Date(promo.expiresAt) < now,
    [now],
  )

  if (isLoading) {
    return <LoadingSpinner className="min-h-[400px]" />
  }

  if (error) {
    const errorInfo = getPromotionErrorInfo(error)
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-destructive">{errorInfo.message}</p>
          {errorInfo.type === 'network' || errorInfo.type === 'server' || errorInfo.type === 'unknown' ? (
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Deactivated Banner */}
      {showDeactivatedBanner && <AccountDeactivatedBanner />}

      {/* Pending/Rejected Banners */}
      {showPendingBanner && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account Pending</AlertTitle>
          <AlertDescription>
            Your merchant account is currently pending admin approval. Some features are restricted until your license is
            approved.
          </AlertDescription>
        </Alert>
      )}

      {guard.showRejectionBanner && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>Account Rejected</AlertTitle>
          <AlertDescription>
            Your merchant account has been rejected. Product management features are restricted. You can
            resubmit your license from your Profile page.{' '}
            <Link to="/merchant/profile" className="underline font-semibold">
              Go to Profile
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 pb-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" /> {t('merchant.promotions.title')}
            </h1>
          </div>
          {showCrudActions && (
            <Button
              size="lg"
              className="font-bold bg-primary shrink-0 w-full sm:w-auto"
              onClick={() => navigate('/merchant/promotions/new')}
            >
              <Plus className="mr-2 h-4 w-4" /> {t('merchant.promotions.addNew')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center p-5">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('merchant.promotions.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val as typeof statusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="mr-2 h-3 w-3" />
                <SelectValue placeholder={t('merchant.promotions.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('merchant.promotions.statusAll')}</SelectItem>
                <SelectItem value="active">{t('merchant.promotions.statusActive')}</SelectItem>
                <SelectItem value="inactive">{t('merchant.promotions.statusInactive')}</SelectItem>
                <SelectItem value="expired">{t('merchant.promotions.statusExpired')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(val) => setSortBy(val as PromotionQueryParams['sortBy'])}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="code">Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Promotion List */}
        {promotions.length === 0 ? (
          <CardContent className="py-10 text-center">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              {t('merchant.promotions.empty')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {t('merchant.promotions.emptyHint')}
            </p>
            {showCrudActions && (
              <Button
                className="mt-4 bg-primary"
                onClick={() => navigate('/merchant/promotions/new')}
              >
                <Plus className="mr-2 h-4 w-4" /> {t('merchant.promotions.addNew')}
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="space-y-3 md:hidden px-5 pb-5">
            {promotions.map((promo) => (
              <Card key={promo.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Code + Status Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-bold truncate">{promo.code}</span>
                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Copy code"
                      >
                        {copiedCode === promo.code ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(promo)}
                    </div>
                  </div>

                  {/* Description */}
                  {promo.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {promo.description}
                    </p>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">{t('merchant.promotions.discountType')}</span>
                      <p className="mt-0.5 font-medium">
                        {promo.discountTypeCode === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('merchant.promotions.discountValue')}</span>
                      <p className="mt-0.5 font-medium">
                        {promo.discountTypeCode === 'percentage'
                          ? `${promo.discountValue}%`
                          : `${Number(promo.discountValue).toLocaleString()} MMK`}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('merchant.promotions.minOrderAmount')}</span>
                      <p className="mt-0.5 text-muted-foreground">
                        {promo.minOrderAmount
                          ? `${Number(promo.minOrderAmount).toLocaleString()} MMK`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('merchant.promotions.usage')}</span>
                      <p className="mt-0.5 text-muted-foreground">{formatUsage(promo)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('merchant.promotions.expiresAt')}</span>
                      <p className={`mt-0.5 ${isExpired(promo) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {formatDate(promo.expiresAt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('merchant.promotions.isActive')}</span>
                      <div className="mt-0.5">
                        {showCrudActions ? (
                          <Switch
                            checked={promo.isActive}
                            onCheckedChange={() => handleToggleActive(promo.id)}
                            disabled={isExpired(promo) || toggleActive.isPending}
                            aria-label="Toggle active"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {promo.isActive ? 'Yes' : 'No'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {showCrudActions && (
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/merchant/promotions/${promo.id}/edit`)}
                        disabled={promo.usedCount > 0}
                        title={
                          promo.usedCount > 0
                            ? t('merchant.promotions.usedRestriction')
                            : t('merchant.promotions.edit')
                        }
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        <span className="text-xs">{t('merchant.promotions.edit')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(promo.id)}
                        disabled={promo.usedCount > 0}
                        title={
                          promo.usedCount > 0
                            ? t('merchant.promotions.usedRestriction')
                            : t('merchant.promotions.delete')
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        <span className="text-xs">{t('merchant.promotions.delete')}</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div
            className={`hidden md:block rounded-md border bg-card overflow-hidden mx-5 ${meta ? '' : 'mb-5'}`}
          >
            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[12%] hidden lg:table-column" />
                <col className="w-[8%] hidden xl:table-column" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                {showCrudActions && <col className="w-[9%]" />}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.code')}>
                      {t('merchant.promotions.code')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.description')}>
                      {t('merchant.promotions.description')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.discountType')}>
                      {t('merchant.promotions.discountType')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.discountValue')}>
                      {t('merchant.promotions.discountValue')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted hidden lg:table-cell">
                    <span className="block truncate" title={t('merchant.promotions.minOrderAmount')}>
                      {t('merchant.promotions.minOrderAmount')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted hidden xl:table-cell">
                    <span className="block truncate" title={t('merchant.promotions.usage')}>
                      {t('merchant.promotions.usage')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.expiresAt')}>
                      {t('merchant.promotions.expiresAt')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.status')}>
                      {t('merchant.promotions.status')}
                    </span>
                  </th>
                  <th scope="col" className="text-left align-middle h-12 px-3 text-sm font-bold text-muted-foreground border-b border-border bg-muted">
                    <span className="block truncate" title={t('merchant.promotions.isActive')}>
                      {t('merchant.promotions.isActive')}
                    </span>
                  </th>
                  {showCrudActions && (
                    <th scope="col" className="text-left align-middle h-12 px-4 text-sm font-bold text-muted-foreground border-b border-border bg-muted text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr
                    key={promo.id}
                    className="transition-colors duration-150 ease-in-out hover:bg-muted/40"
                  >
                    <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card text-foreground font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold">{promo.code}</span>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title="Copy code"
                        >
                          {copiedCode === promo.code ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card"
                      title={promo.description || undefined}
                    >
                      <span className="block truncate">{promo.description || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card">
                      <span className="block truncate">
                        {promo.discountTypeCode === 'percentage'
                          ? 'Percentage'
                          : 'Fixed Amount'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card font-medium">
                      <span className="block truncate">
                        {promo.discountTypeCode === 'percentage'
                          ? `${promo.discountValue}%`
                          : `${Number(promo.discountValue).toLocaleString()} MMK`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card hidden lg:table-cell">
                      <span className="block truncate">
                        {promo.minOrderAmount
                          ? `${Number(promo.minOrderAmount).toLocaleString()} MMK`
                          : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card hidden xl:table-cell">
                      <span className="block truncate">{formatUsage(promo)}</span>
                    </td>
                    <td
                      className={`py-3 px-4 text-[13px] border-b border-border bg-card ${
                        isExpired(promo) ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      <span className="block truncate">{formatDate(promo.expiresAt)}</span>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card">
                      <span className="block truncate">{getStatusBadge(promo)}</span>
                    </td>
                    <td className="py-3 px-3 text-[13px] text-muted-foreground border-b border-border bg-card">
                      {showCrudActions ? (
                        <Switch
                          checked={promo.isActive}
                          onCheckedChange={() => handleToggleActive(promo.id)}
                          disabled={isExpired(promo) || toggleActive.isPending}
                          aria-label="Toggle active"
                        />
                      ) : (
                        <span className="text-muted-foreground block truncate">
                          {promo.isActive ? 'Yes' : 'No'}
                        </span>
                      )}
                    </td>
                    {showCrudActions && (
                      <td className="py-3 px-4 text-[13px] text-muted-foreground border-b border-border bg-card text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/merchant/promotions/${promo.id}/edit`)}
                            disabled={promo.usedCount > 0}
                            title={
                              promo.usedCount > 0
                                ? t('merchant.promotions.usedRestriction')
                                : t('merchant.promotions.edit')
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(promo.id)}
                            disabled={promo.usedCount > 0}
                            title={
                              promo.usedCount > 0
                                ? t('merchant.promotions.usedRestriction')
                                : t('merchant.promotions.delete')
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && (
            <div className="px-5 pb-5">
              <PaginationControls
                page={page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit)
                  setPage(1)
                }}
              />
            </div>
          )}
        </>
      )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('merchant.promotions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('merchant.promotions.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePromotion.isPending}>
              {t('merchant.promotions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deletePromotion.isPending}
            >
              {deletePromotion.isPending ? t('merchant.promotions.deleting') : t('merchant.promotions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
