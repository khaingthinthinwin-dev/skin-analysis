import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  Hourglass,
  ImagePlus,
  Megaphone,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DeleteConfirmDialog } from '@/components/merchant/DeleteConfirmDialog'
import { contentSchema, type ContentForm } from '@/features/merchant/advertisements/schemas'
import { useAdvertisements } from '@/features/merchant/advertisements/hooks/useAdvertisements'
import type { AdPackage, Advertisement } from '@/features/merchant/advertisements/types'

type AdPackageInfo = NonNullable<Advertisement['package']>

type DisplayState =
  | 'active'
  | 'scheduled'
  | 'pending_approval'
  | 'expired'
  | 'inactive'
  | 'rejected'
  | 'content_uploaded'
  | 'draft'

function displayState(ad: Advertisement): DisplayState {
  if (ad.approvalStatus === 'rejected') return 'rejected'
  if (!ad.isActive) return 'inactive'
  if (ad.expiresAt && new Date(ad.expiresAt) < new Date()) return 'expired'
  if (ad.approvalStatus === 'pending' && ad.paymentStatus === 'completed') return 'pending_approval'
  if (ad.approvalStatus === 'approved' && ad.paymentStatus === 'completed') {
    return ad.startsAt && new Date(ad.startsAt) > new Date() ? 'scheduled' : 'active'
  }
  return ad.title || ad.imageUrl ? 'content_uploaded' : 'draft'
}

const tierLabels: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
}

const paymentLabels: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  refunded: 'Refunded',
}

// Badge colors per 画面項目設計書 §4.7: pending = amber, approved = green, rejected = red.
const approvalBadgeClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
}

// Badge colors per 画面項目設計書 §4.7: pending = amber, completed = green, refunded = gray.
const paymentBadgeClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

// EL-12a: approval badge shows Draft / Content Uploaded / Pending / Approved / Rejected.
function approvalBadgeText(ad: Advertisement) {
  if (ad.approvalStatus === 'rejected') return 'Rejected'
  if (ad.approvalStatus === 'approved') return 'Approved'
  if (ad.paymentStatus === 'completed') return 'Pending'
  return ad.title || ad.imageUrl ? 'Content Uploaded' : 'Draft'
}

function formatDate(value: string | Date | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : null
}

function packageLabel(placement: string) {
  return placement.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatMoney(value: string | number) {
  return Number(value).toFixed(2)
}

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

function scrollToAdvertisements() {
  document.getElementById('merchant-advertisements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toFormData(values: ContentForm, includeSchedule: boolean) {
  const formData = new FormData()
  formData.append('title', values.title)
  formData.append('announcementMessage', values.announcementMessage)
  if (values.content) formData.append('content', values.content)
  if (values.linkUrl) formData.append('linkUrl', values.linkUrl)
  if (includeSchedule) formData.append('startsAt', new Date(`${values.startsAt}T00:00:00.000Z`).toISOString())
  if (values.image instanceof File) formData.append('image', values.image)
  return formData
}

export default function Advertisements() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<AdPackage | null>(null)
  const [contentTarget, setContentTarget] = useState<Advertisement | null>(null)
  const [editTarget, setEditTarget] = useState<Advertisement | null>(null)
  const [payTarget, setPayTarget] = useState<Advertisement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [confirmingSelection, setConfirmingSelection] = useState(false)
  const [packagesPage, setPackagesPage] = useState(1)
  const approvedMerchant = user?.licenseStatus === 'approved'
  const params = {
    page,
    limit: 3,
    status: status ? (status as 'active' | 'inactive' | 'expired') : undefined,
    approvalStatus: approvalStatus ? (approvalStatus as 'pending' | 'approved' | 'rejected') : undefined,
    search: debouncedSearch || undefined,
  }
  const { adsQuery, allAdsQuery, packagesQuery, selectPackage, uploadContent, updateContent, pay, toggle, remove, refresh } =
    useAdvertisements(params)
  const ads = useMemo(() => adsQuery.data?.data ?? [], [adsQuery.data?.data])
  const allAds = useMemo(() => allAdsQuery.data?.data ?? [], [allAdsQuery.data?.data])
  const meta = adsQuery.data?.meta
  const packages = packagesQuery.data ?? []
  const PACKAGES_PER_PAGE = 4
  const packagePages = Math.max(1, Math.ceil(packages.length / PACKAGES_PER_PAGE))
  const packagePageIndex = Math.min(packagesPage, packagePages)
  const visiblePackages = packages.slice((packagePageIndex - 1) * PACKAGES_PER_PAGE, packagePageIndex * PACKAGES_PER_PAGE)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  // Stats per 画面項目設計書 §4.4: active / pending approval / expired counts.
  const stats = useMemo(
    () => ({
      active: allAds.filter((ad) => displayState(ad) === 'active').length,
      pending: allAds.filter((ad) => displayState(ad) === 'pending_approval').length,
      expired: allAds.filter((ad) => displayState(ad) === 'expired').length,
    }),
    [allAds],
  )

  const statCards = [
    {
      label: 'Active Ads',
      value: stats.active,
      icon: Megaphone,
      cardClass: 'bg-secondary/50',
      iconClass: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
      onView: () => {
        setStatus('active')
        setApprovalStatus('')
        setSearch('')
        setDebouncedSearch('')
        setPage(1)
        scrollToAdvertisements()
      },
    },
    {
      label: 'Pending Approval',
      value: stats.pending,
      icon: Hourglass,
      cardClass: 'bg-secondary/50',
      iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
      onView: () => {
        setStatus('')
        setApprovalStatus('pending')
        setSearch('')
        setDebouncedSearch('')
        setPage(1)
        scrollToAdvertisements()
      },
    },
    {
      label: 'Expired',
      value: stats.expired,
      icon: History,
      cardClass: 'bg-secondary/50',
      iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
      onView: () => {
        setStatus('expired')
        setApprovalStatus('')
        setSearch('')
        setDebouncedSearch('')
        setPage(1)
        scrollToAdvertisements()
      },
    },
  ]

  const handleSelect = async () => {
    if (!selectedPackage) return
    try {
      const ad = await selectPackage.mutateAsync(selectedPackage.id)
      setSelectedPackage(null)
      setConfirmingSelection(false)
      setContentTarget(ad)
      toast.success('Advertisement draft created')
    } catch {
      toast.error('Selected advertising package is unavailable')
    }
  }

  const handleContentSubmit = async (values: ContentForm) => {
    const target = contentTarget ?? editTarget
    if (!target) return
    try {
      const needsUpload =
        Boolean(contentTarget) || (target.approvalStatus === 'pending' && target.paymentStatus === 'pending' && !target.startsAt)
      if (needsUpload) {
        const updatedAd = await uploadContent.mutateAsync({ id: target.id, formData: toFormData(values, true) })
        setContentTarget(null)
        setEditTarget(null)
        toast.success('Advertisement content saved')
        setPayTarget(updatedAd)
      } else {
        await updateContent.mutateAsync({ id: target.id, formData: toFormData(values, false) })
        setEditTarget(null)
        toast.success('Advertisement content saved')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save advertisement content'
      toast.error(message)
    }
  }

  const handleSaveAndPay = async (values: ContentForm) => {
    const target = editTarget
    if (!target) return
    try {
      const updatedAd = await updateContent.mutateAsync({ id: target.id, formData: toFormData(values, false) })
      setEditTarget(null)
      toast.success('Advertisement saved. Payment required to resubmit.')
      setPayTarget(updatedAd)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save advertisement content'
      toast.error(message)
    }
  }

  const handlePay = async () => {
    if (!payTarget) return
    try {
      await pay.mutateAsync({ id: payTarget.id, paymentReference: paymentReference || undefined })
      setPayTarget(null)
      setPaymentReference('')
      toast.success('Advertisement submitted for approval')
    } catch {
      toast.error('Payment failed. Please try again.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success('Advertisement deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Unable to delete advertisement')
    }
  }

  const handleRefresh = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatus('')
    setApprovalStatus('')
    setPage(1)
    refresh()
  }

  const payPackage = payTarget?.package ?? null
  const payFeeTotal = payTarget?.paymentAmount ?? (payPackage ? formatMoney(Number(payPackage.dailyRate) * payPackage.durationDays) : null)

  return (
    <div className="space-y-6">
      {/* Page Header (EL-01 / EL-02) */}
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Megaphone className="h-7 w-7 text-primary" /> Advertisements
        </h1>
        <p className="text-muted-foreground">Select an advertising package, upload your content, and manage your advertisements.</p>
      </div>

      {/* Pending Merchant Banner (§4.3) */}
      {user?.licenseStatus === 'pending' && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your
            shop is approved.
          </AlertDescription>
        </Alert>
      )}
      {user?.licenseStatus === 'rejected' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your shop is pending approval. You can browse packages and view your ads, but you cannot select a package until your
            shop is approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards (§4.4) */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={`${stat.cardClass} cursor-pointer rounded-xl border border-transparent transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md`}
            onClick={stat.onView}
          >
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {allAdsQuery.isLoading ? (
                    <Skeleton className="h-9 w-12" />
                  ) : (
                    <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  )}
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${stat.iconClass}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Package Catalog (§4.5) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Available Packages</h2>
          <p className="text-sm text-muted-foreground">Admin-created packages with fixed campaign durations.</p>
        </div>
        {packagesQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton className="h-64" key={item} />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No advertisement packages are available right now. Please check back later.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {visiblePackages.map((pkg) => (
                <Card key={pkg.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{packageLabel(pkg.placement)}</CardTitle>
                      <Badge variant="secondary" className="capitalize">
                        {tierLabels[pkg.tier] ?? pkg.tier}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary">${pkg.dailyRate}</span>
                      <span className="text-sm text-muted-foreground">/day</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> {pkg.durationDays}-day campaign
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> Up to {pkg.maxAds} ads
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> Total fee:{' '}
                        <span className="font-semibold text-foreground">${pkg.totalFee}</span>
                      </li>
                    </ul>
                    <Button
                      className="mt-auto w-full bg-primary/10 text-primary hover:bg-primary/20"
                      disabled={!approvedMerchant}
                      onClick={() => {
                        setSelectedPackage(pkg)
                        setConfirmingSelection(true)
                      }}
                    >
                      Select Package
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {packages.length > PACKAGES_PER_PAGE && (
              <Pagination page={packagePageIndex} totalPages={packagePages} onPageChange={setPackagesPage} />
            )}
          </>
        )}
      </section>

      {/* Your Advertisements (§4.6 Toolbar + §4.7 Ad Cards + §4.8 Pagination) */}
      <section id="merchant-advertisements" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold">Your Advertisements</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search ads"
                className="pl-9 sm:w-64"
                maxLength={100}
                placeholder="Search ads..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              value={status || 'all'}
              onValueChange={(value) => {
                setStatus(value === 'all' ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="sm:w-[150px]" aria-label="Status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All</SelectItem>
                <SelectItem value="active">Status: Active</SelectItem>
                <SelectItem value="inactive">Status: Inactive</SelectItem>
                <SelectItem value="expired">Status: Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={approvalStatus || 'all'}
              onValueChange={(value) => {
                setApprovalStatus(value === 'all' ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="sm:w-[170px]" aria-label="Approval status filter">
                <SelectValue placeholder="Approval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Approval: All</SelectItem>
                <SelectItem value="pending">Approval: Pending</SelectItem>
                <SelectItem value="approved">Approval: Approved</SelectItem>
                <SelectItem value="rejected">Approval: Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={adsQuery.isFetching}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${adsQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {adsQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton className="h-80" key={item} />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Megaphone className="h-10 w-10" />
              <p>No advertisements found.</p>
              <p className="text-sm">Select a package above to create your first advertisement.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {ads.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                onEdit={(target) => setEditTarget(target)}
                onPay={(target) => setPayTarget(target)}
                onDelete={(target) => setDeleteTarget(target)}
                onToggle={(target, isActive) => toggle.mutate({ id: target.id, isActive })}
              />
            ))}
          </div>
        )}

        {/* Pagination (§4.8) */}
        {meta && <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />}
      </section>

      {/* Package Selection Confirmation (§4.9) */}
      <Dialog open={confirmingSelection} onOpenChange={setConfirmingSelection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Advertising Package</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-2 text-sm">
              {(
                [
                  ['Placement', packageLabel(selectedPackage.placement)],
                  ['Tier', tierLabels[selectedPackage.tier] ?? selectedPackage.tier],
                  ['Daily Rate', `$${selectedPackage.dailyRate}/day`],
                  ['Duration', `${selectedPackage.durationDays} days`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t pt-2">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-bold text-primary">${selectedPackage.totalFee}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingSelection(false)} disabled={selectPackage.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={selectPackage.isPending}>
              {selectPackage.isPending ? 'Selecting...' : 'Confirm Selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload / Edit Ad Content (§4.10 / §4.12) */}
      <ContentDialog
        open={Boolean(contentTarget || editTarget)}
        target={contentTarget ?? editTarget}
        adPackage={contentTarget?.package ?? editTarget?.package ?? null}
        onClose={() => {
          setContentTarget(null)
          setEditTarget(null)
        }}
        onSubmit={handleContentSubmit}
        onSaveAndPay={handleSaveAndPay}
        showSaveAndPay={Boolean(editTarget?.approvalStatus === 'rejected')}
        isPending={uploadContent.isPending || updateContent.isPending}
      />

      {/* Payment Confirmation (§4.11) */}
      <Dialog open={Boolean(payTarget)} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Advertising Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-semibold text-primary">Advertising Fee: {payFeeTotal ? `$${payFeeTotal}` : 'Calculated at payment'}</p>
            {payPackage && (
              <p className="text-muted-foreground">
                {payPackage.durationDays} days × ${payPackage.dailyRate}/day
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-reference">Payment reference (optional)</Label>
            <Input
              id="payment-reference"
              maxLength={100}
              placeholder="Payment transaction reference"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={pay.isPending}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={pay.isPending}>
              <CreditCard className="mr-2 h-4 w-4" />
              {pay.isPending ? 'Processing payment...' : 'Pay & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation (soft delete, BR-AD-012) */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Advertisement"
        description={
          deleteTarget?.title
            ? `Are you sure you want to delete "${deleteTarget.title}"? The advertisement will be deactivated and kept for history.`
            : 'Are you sure you want to delete this advertisement? It will be deactivated and kept for history.'
        }
        isLoading={remove.isPending}
      />
    </div>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        {pages.map((pageNumber) => (
          <Button
            key={pageNumber}
            size="sm"
            variant={pageNumber === page ? 'default' : 'outline'}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface AdCardProps {
  ad: Advertisement
  onEdit: (ad: Advertisement) => void
  onPay: (ad: Advertisement) => void
  onDelete: (ad: Advertisement) => void
  onToggle: (ad: Advertisement, isActive: boolean) => void
}

function AdCard({ ad, onEdit, onPay, onDelete, onToggle }: AdCardProps) {
  const state = displayState(ad)
  const isRejected = ad.approvalStatus === 'rejected'
  const canEdit = state === 'draft' || state === 'content_uploaded'
  const canDelete = isRejected || state === 'draft' || state === 'content_uploaded' || state === 'inactive'
  const canToggle = state !== 'expired' && ad.approvalStatus === 'approved' && ad.paymentStatus === 'completed'
  const packageInfo = ad.package
  const expiresTomorrow =
    ad.expiresAt && (() => {
      const t = new Date(ad.expiresAt).getTime()
      const now = new Date()
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
      return t >= tomorrowStart && t < tomorrowStart + 24 * 60 * 60 * 1000
    })()
  const expiresToday =
    ad.expiresAt && (() => {
      const t = new Date(ad.expiresAt).getTime()
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      return t >= todayStart && t < todayStart + 24 * 60 * 60 * 1000 && t > now.getTime()
    })()

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Ad Thumbnail (EL-10) with approval status badge (EL-12a) */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {ad.imageUrl ? (
          <img src={getImageUrl(ad.imageUrl)} alt={ad.title || 'Advertisement'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImagePlus className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge className={approvalBadgeClass[ad.approvalStatus] ?? ''}>{approvalBadgeText(ad)}</Badge>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold">{ad.title || 'Draft advertisement'}</h3>
        {packageInfo && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {tierLabels[packageInfo.tier] ?? packageInfo.tier} Package • ${packageInfo.dailyRate}/day
            </p>
            <Badge className={paymentBadgeClass[ad.paymentStatus] ?? ''}>{paymentLabels[ad.paymentStatus] ?? ad.paymentStatus}</Badge>
          </div>
        )}
        {ad.content && (
          <p className="line-clamp-2 text-sm text-muted-foreground" title={ad.content}>
            {ad.content}
          </p>
        )}
        {ad.announcementMessage && (
          <p className="line-clamp-1 text-sm font-medium" title={ad.announcementMessage}>
            {ad.announcementMessage}
          </p>
        )}
        {ad.startsAt && ad.expiresAt && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span>Start date:</span>
              <span className="font-medium text-foreground">{ad.startsAt.slice(0, 10)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span>End date:</span>
              <span className="font-medium text-foreground">{ad.expiresAt.slice(0, 10)}</span>
            </span>
          </div>
        )}
        {expiresTomorrow && ad.expiresAt && (
          <div className="rounded-md border-2 border-amber-500 bg-amber-100 p-3 text-sm font-medium text-amber-800 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your Advertisement will expire tomorrow.</span>
            </div>
          </div>
        )}
        {expiresToday && ad.expiresAt && (
          <div className="rounded-md border-2 border-amber-500 bg-amber-100 p-3 text-sm font-medium text-amber-800 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your Advertisement will expire today.</span>
            </div>
          </div>
        )}
        {state === 'expired' && (
          <div className="rounded-md border-2 border-red-500 bg-red-100 p-3 text-sm font-medium text-red-800 dark:border-red-500 dark:bg-red-950/60 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your advertisement has expired.</span>
            </div>
          </div>
        )}
        {isRejected && ad.rejectionReason && (
          <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{ad.rejectionReason}</span>
            </div>
            <button
              type="button"
              className="mt-2 font-semibold underline underline-offset-2 hover:opacity-80"
              onClick={() => onEdit(ad)}
            >
              Edit &amp; Resubmit
            </button>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div>
            {canToggle ? (
              <div className="flex items-center gap-2">
                <Switch checked={ad.isActive} onCheckedChange={(isActive) => onToggle(ad, isActive)} aria-label="Toggle active" />
                <span className="text-sm">{ad.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            ) : state === 'expired' ? (
              <span className="text-sm text-muted-foreground">Inactive</span>
            ) : (
              <span className="text-xs text-muted-foreground">Created {formatDate(ad.createdAt)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {state === 'content_uploaded' && (
              <Button size="sm" onClick={() => onPay(ad)}>
                <CreditCard className="mr-1.5 h-4 w-4" /> Pay Fee
              </Button>
            )}
            {isRejected && (
              <Button size="sm" onClick={() => onEdit(ad)}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit &amp; Resubmit
              </Button>
            )}
            {canEdit && !isRejected && (
              <Button size="sm" variant="outline" onClick={() => onEdit(ad)}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(ad)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContentDialogProps {
  open: boolean
  target: Advertisement | null
  adPackage: AdPackageInfo | null
  onClose: () => void
  onSubmit: (values: ContentForm) => Promise<void>
  onSaveAndPay?: (values: ContentForm) => Promise<void>
  showSaveAndPay?: boolean
  isPending: boolean
}

function ContentDialog({
  open,
  target,
  adPackage,
  onClose,
  onSubmit,
  onSaveAndPay,
  showSaveAndPay,
  isPending,
}: ContentDialogProps) {
  const form = useForm<ContentForm>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: '',
      content: '',
      linkUrl: '',
      announcementMessage: '',
      startsAt: new Date().toISOString().slice(0, 10),
      image: null,
    },
  })
  const startsAt = form.watch('startsAt')
  const imageFile = form.watch('image')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (imageFile instanceof File) {
      const url = URL.createObjectURL(imageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [imageFile])

  useEffect(() => {
    if (target) {
      form.reset({
        title: target.title,
        content: target.content ?? '',
        linkUrl: target.linkUrl ?? '',
        announcementMessage: target.announcementMessage,
        startsAt: target.startsAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        image: null,
      })
    }
  }, [target, form])

  if (!target) return null

  const isNewUpload = !target.title
  const canSetSchedule = !target.startsAt
  const durationDays = adPackage?.durationDays ?? 7
  const endDate = startsAt ? new Date(`${startsAt}T00:00:00.000Z`) : null
  if (endDate) endDate.setUTCDate(endDate.getUTCDate() + durationDays)
  const feeSummary = adPackage
    ? `Advertising Fee: $${formatMoney(Number(adPackage.dailyRate) * durationDays)} · ${durationDays} days × $${adPackage.dailyRate}/day`
    : null
  const currentPreview = imageFile instanceof File ? previewUrl : target.imageUrl ? getImageUrl(target.imageUrl) : null

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNewUpload ? 'Upload Advertisement Content' : 'Edit Advertisement Content'}</DialogTitle>
        </DialogHeader>

        {/* Read-only placement / tier display (EL-22a / EL-22b) */}
        {adPackage && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">Placement:</span>
            <span className="font-medium">{packageLabel(adPackage.placement)}</span>
            <Badge variant="secondary" className="capitalize">
              {tierLabels[adPackage.tier] ?? adPackage.tier}
            </Badge>
          </div>
        )}

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="ad-title">Title</Label>
            <Input id="ad-title" maxLength={200} placeholder="Enter advertisement title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ad-content">Content</Label>
            <Textarea id="ad-content" maxLength={5000} placeholder="Enter advertisement content" {...form.register('content')} />
            {form.formState.errors.content && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.content.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ad-image">Advertisement image</Label>
            <Input
              id="ad-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (file && file.size > 5 * 1024 * 1024) {
                  form.setError('image', { message: 'Image file must not exceed 5MB' })
                  return
                }
                if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                  form.setError('image', { message: 'Image must be JPG, PNG, or WebP' })
                  return
                }
                form.clearErrors('image')
                form.setValue('image', file)
              }}
            />
            {currentPreview && (
              <img src={currentPreview} alt="Advertisement preview" className="mt-2 aspect-video w-full rounded-lg object-cover" />
            )}
            {form.formState.errors.image && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.image.message as string}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ad-link">Link URL</Label>
            <Input id="ad-link" type="url" maxLength={2048} placeholder="https://example.com" {...form.register('linkUrl')} />
            {form.formState.errors.linkUrl && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.linkUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ad-announcement">Announcement message</Label>
            <Textarea
              id="ad-announcement"
              maxLength={500}
              placeholder="Enter banner announcement message"
              {...form.register('announcementMessage')}
            />
            {form.formState.errors.announcementMessage && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.announcementMessage.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ad-start">Start date</Label>
              <Input
                id="ad-start"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                disabled={!canSetSchedule}
                {...form.register('startsAt')}
              />
              {form.formState.errors.startsAt && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.startsAt.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-end">End date (auto-calculated)</Label>
              <Input
                id="ad-end"
                type="date"
                value={endDate ? endDate.toISOString().slice(0, 10) : ''}
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Fee summary (EL-29 / lblFeeSummary) */}
          {feeSummary && <p className="rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary">{feeSummary}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            {showSaveAndPay && onSaveAndPay && (
              <Button type="button" disabled={isPending} onClick={() => form.handleSubmit(onSaveAndPay)()}>
                {isPending ? 'Saving...' : 'Save & Pay'}
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isNewUpload ? 'Save & Continue' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
