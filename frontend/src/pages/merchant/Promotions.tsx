import { useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router'
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
import type { PromotionQueryParams, Promotion } from '@/types/promotion.types'

export default function Promotions() {
  const { t } = useTranslation('promotions')
  const { user } = useAuth()
  const guard = useMerchantProductsGuard()
  const status = user?.licenseStatus || user?.license_status
  const isPending = guard.isPending || status === 'pending'
  const showCrudActions = guard.showCrudActions && !isPending

  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PromotionQueryParams['status']>('all')
  const [sortBy, setSortBy] = useState<PromotionQueryParams['sortBy']>('newest')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const queryParams: PromotionQueryParams = {
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy,
    page,
    limit: 10,
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

  const getDiscountBadge = useCallback(
    (promo: Promotion) => {
      if (promo.discountTypeCode === 'percentage') {
        return <Badge className="bg-blue-100 text-blue-800">{t('merchant.promotions.form.percentage')}</Badge>
      }
      return <Badge className="bg-green-100 text-green-800">{t('merchant.promotions.form.fixed')}</Badge>
    },
    [t],
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

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Pending/Rejected Banners */}
      {guard.showPendingBanner && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t('merchant.promotions.pendingBannerTitle', 'Pending Approval')}</AlertTitle>
          <AlertDescription>
            {t('merchant.promotions.pendingBanner')}
          </AlertDescription>
        </Alert>
      )}

      {guard.showRejectionBanner && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>{t('merchant.promotions.rejectedBannerTitle', 'Account Rejected')}</AlertTitle>
          <AlertDescription>
            Your merchant account has been rejected. Promotion management features are restricted. You can resubmit your license from your Profile page.{' '}
            <Link to="/merchant/profile" className="underline font-medium hover:text-destructive/80">
              Go to Profile
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600" /> {t('merchant.promotions.title')}
          </h1>
        </div>
        {showCrudActions && (
          <Button
            size="lg"
            className="font-bold bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
            onClick={() => navigate('/merchant/promotions/new')}
          >
            <Plus className="mr-2 h-4 w-4" /> {t('merchant.promotions.addNew')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
      {isLoading ? (
        <LoadingSpinner className="min-h-[400px]" />
      ) : error ? (
        (() => {
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
        })()
      ) : promotions.length === 0 ? (
        <Card>
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
                className="mt-4 bg-pink-600 hover:bg-pink-700 text-white"
                onClick={() => navigate('/merchant/promotions/new')}
              >
                <Plus className="mr-2 h-4 w-4" /> {t('merchant.promotions.addNew')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="space-y-3 md:hidden">
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
                      <div className="mt-0.5">{getDiscountBadge(promo)}</div>
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
          <div className="hidden md:block rounded-lg border border-border/80 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('merchant.promotions.code')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      {t('merchant.promotions.description')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('merchant.promotions.discountType')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('merchant.promotions.discountValue')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      {t('merchant.promotions.minOrderAmount')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">
                      {t('merchant.promotions.usage')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('merchant.promotions.expiresAt')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('merchant.promotions.status')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('merchant.promotions.isActive')}
                    </th>
                    {showCrudActions && (
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promo) => (
                    <tr
                      key={promo.id}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold">{promo.code}</span>
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
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
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate hidden lg:table-cell">
                        {promo.description || '-'}
                      </td>
                      <td className="px-4 py-3">{getDiscountBadge(promo)}</td>
                      <td className="px-4 py-3 font-medium">
                        {promo.discountTypeCode === 'percentage'
                          ? `${promo.discountValue}%`
                          : `${Number(promo.discountValue).toLocaleString()} MMK`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {promo.minOrderAmount
                          ? `${Number(promo.minOrderAmount).toLocaleString()} MMK`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                        {formatUsage(promo)}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          isExpired(promo) ? 'text-red-600 font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {formatDate(promo.expiresAt)}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(promo)}</td>
                      <td className="px-4 py-3">
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
                      </td>
                      {showCrudActions && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
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
                              <Pencil className="h-4 w-4" />
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
          </div>
        </>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            {t('merchant.promotions.pageInfo', {
              page: page,
              totalPages: meta.totalPages,
              total: meta.total,
            })}
          </p>
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, meta.totalPages - 4))
              const pageNum = startPage + i
              if (pageNum > meta.totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="min-w-[36px]"
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
