import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
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
  ShieldAlert,
  Trash2,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AccountDeactivatedBanner } from '@/components/merchant/AccountDeactivatedBanner'
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
import { contentSchema, resubmitContentSchema, uploadContentSchema, type ContentForm } from '@/features/merchant/advertisements/schemas'
import { useAdvertisements } from '@/features/merchant/advertisements/hooks/useAdvertisements'
import { ProductImagePicker } from '@/features/merchant/advertisements/components/ProductImagePicker'
import type { AdContentPayload } from '@/features/merchant/advertisements/services/advertisement.service'
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
  if (ad.expiresAt && new Date(ad.expiresAt) < new Date()) return 'expired'
  if (ad.approvalStatus === 'rejected') return 'rejected'
  if (!ad.isActive) return 'inactive'
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

// Fees are whole Kyat amounts. The API returns them as fixed-point strings
// ("500.00"), so the trailing ".00" is dropped for display while any real
// decimals are kept ("500.50") and thousands are grouped ("12500.00" ->
// "12,500").
function formatFee(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Sort key for the package catalog. Packages without a parsable `updatedAt`
// (e.g. a payload cached by an older backend) sort to the end instead of
// producing NaN comparisons that leave the order undefined.
function packageUpdatedAt(pkg: AdPackage) {
  if (!pkg.updatedAt) return 0
  const parsed = new Date(pkg.updatedAt).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

function scrollToAdvertisements() {
  window.setTimeout(() => {
    document.getElementById('merchant-advertisements')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, 60)
}

function toContentPayload(values: ContentForm, includeSchedule: boolean): AdContentPayload {
  return {
    title: values.title,
    announcementMessage: values.announcementMessage,
    ...(values.content ? { content: values.content } : {}),
    // Advertisement images are picked from the merchant's own products, so the
    // path is sent as-is; the backend verifies it belongs to their catalogue.
    ...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
    ...(includeSchedule
      ? { startsAt: new Date(`${values.startsAt}T00:00:00.000Z`).toISOString() }
      : {}),
  }
}

export default function Advertisements() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<AdPackage | null>(null)
  const [contentTarget, setContentTarget] = useState<Advertisement | null>(null)
  const [editTarget, setEditTarget] = useState<Advertisement | null>(null)
  const [payTarget, setPayTarget] = useState<Advertisement | null>(null)
  const [viewTarget, setViewTarget] = useState<Advertisement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [confirmingSelection, setConfirmingSelection] = useState(false)
  const [packagesPage, setPackagesPage] = useState(1)
  const [highlightedPackageId, setHighlightedPackageId] = useState<string | null>(null)
  const [navigateToPackageId, setNavigateToPackageId] = useState<string | null>(null)
  const [highlightAdId, setHighlightAdId] = useState<string | null>(() =>
    searchParams.get('highlightAdId')
  )
  const isDeactivated =
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive'
  const licenseStatus = user?.licenseStatus || user?.license_status
  const isPendingMerchant = licenseStatus === 'pending'
  const isRejectedMerchant = licenseStatus === 'rejected'
  const approvedMerchant = licenseStatus === 'approved' && !isDeactivated
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
  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data])
  const PACKAGES_PER_PAGE = 4
  // Package cards are ordered most-recently-updated first: GET /ads/packages
  // already sorts by ad_fee_settings.updated_at DESC (DD_05 §2.9), and
  // re-sorting here keeps the display correct for any cached payload.
  // Array#sort is stable, so packages sharing a timestamp keep the backend's
  // placement → tier tie-break. The package a NEW_ADS_PACKAGE /
  // ADS_PACKAGE_UPDATED notification points at (?updatedPackage=…) is pinned to
  // the very front so its "Updated" badge is always the first card rather than
  // landing on a later page.
  const orderedPackages = useMemo(() => {
    const sorted = [...packages].sort((a, b) => packageUpdatedAt(b) - packageUpdatedAt(a))
    if (!highlightedPackageId) return sorted
    const highlightedIndex = sorted.findIndex((pkg) => pkg.id === highlightedPackageId)
    if (highlightedIndex <= 0) return sorted
    return [
      sorted[highlightedIndex],
      ...sorted.slice(0, highlightedIndex),
      ...sorted.slice(highlightedIndex + 1),
    ]
  }, [packages, highlightedPackageId])
  const packagePages = Math.max(1, Math.ceil(orderedPackages.length / PACKAGES_PER_PAGE))
  const packagePageIndex = Math.min(packagesPage, packagePages)
  const visiblePackages = orderedPackages.slice((packagePageIndex - 1) * PACKAGES_PER_PAGE, packagePageIndex * PACKAGES_PER_PAGE)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const updatedPackageId = searchParams.get('updatedPackage')
    if (!updatedPackageId) return

    const timer = window.setTimeout(() => {
      const packagesList = packagesQuery.data ?? []
      const pkgIndex = packagesList.findIndex((p) => p.id === updatedPackageId)
      if (pkgIndex >= 0) {
        const pageForPkg = Math.floor(pkgIndex / PACKAGES_PER_PAGE) + 1
        setPackagesPage(pageForPkg)
      } else {
        setPackagesPage(1)
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('updatedPackage')
          return next
        },
        { replace: true }
      )
      document.getElementById('available-packages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Trigger highlight after page state is updated
      setNavigateToPackageId(updatedPackageId)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [searchParams, setSearchParams, packagesQuery.data])

  useEffect(() => {
    if (!navigateToPackageId) return
    const timer = window.setTimeout(() => {
      setHighlightedPackageId(navigateToPackageId)
      setNavigateToPackageId(null)
    }, 50)
    return () => window.clearTimeout(timer)
  }, [navigateToPackageId, packagesPage])

  useEffect(() => {
    if (!highlightedPackageId) return
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`ad-package-${highlightedPackageId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      // Auto-clear highlight after 5 seconds
      const clearTimer = window.setTimeout(() => {
        setHighlightedPackageId(null)
      }, 5000)
      return () => window.clearTimeout(clearTimer)
    }, 100)
    return () => window.clearTimeout(timer)
  }, [highlightedPackageId])

  // Handle highlightAdId from URL (e.g., from AD_APPROVED notification)
  useEffect(() => {
    const adId = searchParams.get('highlightAdId')
    if (adId && adId !== highlightAdId) {
      // Defer state update to avoid synchronous setState in effect
      window.setTimeout(() => {
        setHighlightAdId(adId)
        // Auto-clear highlight after 4 seconds
        const timer = window.setTimeout(() => {
          setHighlightAdId(null)
          // Clean up URL
          const params = new URLSearchParams(searchParams)
          params.delete('highlightAdId')
          window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`)
        }, 4000)
        return () => window.clearTimeout(timer)
      }, 0)
    }
  }, [searchParams, highlightAdId])

  // When coming from notification (highlightAdId in URL), clear approvalStatus filter to show all ads
  useEffect(() => {
    const highlightAdIdFromUrl = searchParams.get('highlightAdId')
    if (highlightAdIdFromUrl && approvalStatus) {
      window.setTimeout(() => {
        setApprovalStatus('')
        setPage(1)
      }, 0)
    }
  }, [searchParams, approvalStatus, setPage])

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
        const updatedAd = await uploadContent.mutateAsync({ id: target.id, payload: toContentPayload(values, true) })
        setContentTarget(null)
        setEditTarget(null)
        toast.success('Advertisement content saved')
        setPayTarget(updatedAd)
      } else {
        // Content-uploaded ads that have not been paid yet may re-pick their
        // start date; rejected ads are rescheduled on resubmit. In both cases
        // the backend derives a fresh expires_at from the package duration.
        const includeSchedule = target.approvalStatus === 'rejected' || target.paymentStatus === 'pending'
        await updateContent.mutateAsync({ id: target.id, payload: toContentPayload(values, includeSchedule) })
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
      const updatedAd = await updateContent.mutateAsync({
        id: target.id,
        payload: toContentPayload(values, target.approvalStatus === 'rejected'),
      })
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
  const payFeeTotal = payTarget?.paymentAmount ?? (payPackage ? Number(payPackage.dailyRate) * payPackage.durationDays : null)

  return (
    <div className="space-y-6">
      {/* Page Header (EL-01 / EL-02) */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Megaphone className="h-6 w-6 text-primary sm:h-7 sm:w-7" /> Advertisements
        </h1>
        <p className="text-muted-foreground">Select an advertising package, upload your content, and manage your advertisements.</p>
      </div>

      {/* Deactivated Banner */}
      {isDeactivated && <AccountDeactivatedBanner />}

      {/* Pending Merchant Banner */}
      {!isDeactivated && isPendingMerchant && (
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account Pending</AlertTitle>
          <AlertDescription>
            Your merchant account is currently pending admin approval. Some features are restricted until your license is
            approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Rejected Merchant Banner */}
      {!isDeactivated && isRejectedMerchant && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>Account Rejected</AlertTitle>
          <AlertDescription>
            Your merchant account has been rejected. Product management features are restricted. You can resubmit your
            license from your Profile page.{' '}
            <Link to="/merchant/profile" className="underline font-semibold">
              Go to Profile
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards (§4.4) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <p className="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</p>
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
      <section id="available-packages" className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Available Packages</h2>
          <p className="text-sm text-muted-foreground">Admin-created packages with fixed campaign durations.</p>
        </div>
        {packagesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visiblePackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  id={`ad-package-${pkg.id}`}
                  className={`flex flex-col transition-all duration-300 ${
                    highlightedPackageId === pkg.id
                      ? 'ring-4 ring-purple-500 ring-offset-4 ring-offset-background scale-[1.02] shadow-2xl shadow-purple-500/30 animate-pulse'
                      : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{packageLabel(pkg.placement)}</CardTitle>
                      <div className="flex items-center gap-1">
                        {highlightedPackageId === pkg.id && (
                          <Badge className="bg-purple-600 text-white">Updated</Badge>
                        )}
                        <Badge variant="secondary" className="capitalize">
                          {tierLabels[pkg.tier] ?? pkg.tier}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary sm:text-3xl">{formatFee(pkg.dailyRate)} KS</span>
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
                        <span className="font-semibold text-foreground">{formatFee(pkg.totalFee)} KS</span>
                      </li>
                    </ul>
                    <Button
                      className="mt-auto w-full bg-primary/10 text-primary hover:bg-primary/20"
                      disabled={!approvedMerchant || isDeactivated}
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
            {orderedPackages.length > PACKAGES_PER_PAGE && (
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {ads.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                isDeactivated={isDeactivated}
                highlightAdId={highlightAdId}
                onEdit={(target) => setEditTarget(target)}
                onPay={(target) => setPayTarget(target)}
                onDelete={(target) => setDeleteTarget(target)}
                onView={(target) => setViewTarget(target)}
                onToggle={(target) => {
                  const next = !target.isActive
                  toggle.mutate(
                    { id: target.id, isActive: next },
                    {
                      onSuccess: () =>
                        toast.success(
                          next ? 'Advertisement activated' : 'Advertisement deactivated',
                        ),
                      onError: (error) => {
                        const axiosError = error as {
                          response?: { data?: { message?: string } }
                        }
                        toast.error(
                          axiosError.response?.data?.message ||
                            (error instanceof Error
                              ? error.message
                              : 'Unable to update advertisement status'),
                        )
                      },
                    },
                  )
                }}
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
                  ['Daily Rate', `${formatFee(selectedPackage.dailyRate)} KS/day`],
                  ['Duration', `${selectedPackage.durationDays} days`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="min-w-0 break-words text-right font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t pt-2">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="shrink-0 font-bold text-primary">{formatFee(selectedPackage.totalFee)} KS</span>
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
            <p className="font-semibold text-primary">Advertising Fee: {payFeeTotal !== null && payFeeTotal !== undefined ? `${formatFee(payFeeTotal)} KS` : 'Calculated at payment'}</p>
            {payPackage && (
              <p className="text-muted-foreground">
                {payPackage.durationDays} days × {formatFee(payPackage.dailyRate)} KS/day
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

      {/* View Detail Dialog (read-only, follows btnViewAd read-only modal pattern) */}
      <AdViewDialog ad={viewTarget} onClose={() => setViewTarget(null)} />

      {/* Delete Confirmation (soft delete, BR-AD-012) */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Advertisement"
        description={
          deleteTarget?.paymentStatus === 'pending'
            ? deleteTarget.title
              ? `Are you sure you want to delete "${deleteTarget.title}"? It has not been paid and will be permanently deleted from the system.`
              : 'Are you sure you want to delete this draft? It has not been paid and will be permanently deleted from the system.'
            : deleteTarget && displayState(deleteTarget) === 'expired'
              ? deleteTarget.title
                ? `Are you sure you want to delete "${deleteTarget.title}"? The advertisement has expired and will be permanently deleted from the system.`
                : 'Are you sure you want to delete this advertisement? It has expired and will be permanently deleted from the system.'
              : deleteTarget?.title
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
          <ChevronLeft className="mr-1 h-4 w-4" /> Prev
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
  isDeactivated?: boolean
  highlightAdId?: string | null
  onEdit: (ad: Advertisement) => void
  onPay: (ad: Advertisement) => void
  onDelete: (ad: Advertisement) => void
  onToggle: (ad: Advertisement, isActive: boolean) => void
  onView: (ad: Advertisement) => void
}

function AdCard({ ad, isDeactivated, highlightAdId, onEdit, onPay, onDelete, onToggle, onView }: AdCardProps) {
  const state = displayState(ad)
  const isRejected = ad.approvalStatus === 'rejected'
  const canEdit = state === 'draft' || state === 'content_uploaded'
  const canDelete = isRejected || state === 'draft' || state === 'content_uploaded' || state === 'expired'
  const canToggle = state !== 'expired' && ad.approvalStatus === 'approved' && ad.paymentStatus === 'completed'
  const isScheduled = state === 'scheduled'
  const packageInfo = ad.package
  const isHighlighted = highlightAdId === ad.id
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

  // Scroll to highlighted ad when highlightAdId matches this ad
  useEffect(() => {
    if (!isHighlighted) return
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`highlighted-ad-${ad.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    return () => window.clearTimeout(timer)
  }, [isHighlighted, ad.id])

  return (
    <Card
      className={`flex flex-col overflow-hidden transition-all duration-300 ${
        isHighlighted
          ? 'ring-4 ring-violet-500 ring-offset-4 ring-offset-background scale-[1.02] shadow-2xl shadow-violet-500/30 animate-pulse'
          : ''
      }`}
      id={isHighlighted ? `highlighted-ad-${ad.id}` : undefined}
    >
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
        <h3 className="break-words text-base font-semibold">{ad.title || 'Draft advertisement'}</h3>
        {packageInfo && (
          <p className="text-sm text-muted-foreground">Placement: {packageLabel(packageInfo.placement)}</p>
        )}
        {packageInfo && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {tierLabels[packageInfo.tier] ?? packageInfo.tier} Package • {formatFee(packageInfo.dailyRate)} KS/day
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
            {!isDeactivated && (
              <button
                type="button"
                className="mt-2 font-semibold underline underline-offset-2 hover:opacity-80"
                onClick={() => onEdit(ad)}
              >
                Edit &amp; Resubmit
              </button>
            )}
          </div>
        )}

        {state === 'draft' ? (
          <div className="mt-auto space-y-2 border-t pt-3">
            <span className="block text-xs text-muted-foreground">Created {formatDate(ad.createdAt)}</span>
            <div className="flex flex-wrap justify-end gap-2">
              {canEdit && !isRejected && (
                <Button size="sm" variant="outline" className="w-9 px-0" aria-label="Edit advertisement" title="Edit" onClick={() => onEdit(ad)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="ghost" className="w-9 px-0 text-destructive hover:text-destructive" aria-label="Delete advertisement" title="Delete" onClick={() => onDelete(ad)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="w-9 px-0" aria-label="View advertisement" title="View" onClick={() => onView(ad)}>
                  <Eye className="h-4 w-4" />
                </Button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div>
              {canToggle && !isScheduled ? (
                <div className="flex items-center gap-2">
                  <Switch checked={ad.isActive} onCheckedChange={(isActive) => onToggle(ad, isActive)} aria-label="Toggle active" />
                  <span className="text-sm">{ad.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ) : isScheduled || state === 'expired' || state === 'pending_approval' ? (
                <span className="text-sm text-muted-foreground">Inactive</span>
              ) : (
                <span className="text-xs text-muted-foreground">Created {formatDate(ad.createdAt)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {state === 'content_uploaded' && (
                <Button size="sm" className="w-9 px-0" aria-label="Pay fee" title="Pay Fee" onClick={() => onPay(ad)}>
                  <CreditCard className="h-4 w-4" />
                </Button>
              )}
              {isRejected && (
                <Button size="sm" className="w-9 px-0" aria-label="Edit and resubmit" title="Edit & Resubmit" onClick={() => onEdit(ad)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canEdit && !isRejected && (
                <Button size="sm" variant="outline" className="w-9 px-0" aria-label="Edit advertisement" title="Edit" onClick={() => onEdit(ad)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="ghost" className="w-9 px-0 text-destructive hover:text-destructive" aria-label="Delete advertisement" title="Delete" onClick={() => onDelete(ad)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="w-9 px-0" aria-label="View advertisement" title="View" onClick={() => onView(ad)}>
                  <Eye className="h-4 w-4" />
                </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AdViewDialogProps {
  ad: Advertisement | null
  onClose: () => void
}

// Read-only detail dialog (mirrors the admin btnViewAd read-only modal pattern).
function AdViewDialog({ ad, onClose }: AdViewDialogProps) {
  if (!ad) return null
  const state = displayState(ad)
  const packageInfo = ad.package
  const rows: Array<[string, string | null]> = [
    ['Placement', packageInfo ? packageLabel(packageInfo.placement) : null],
    ['Tier', packageInfo ? (tierLabels[packageInfo.tier] ?? packageInfo.tier) : null],
    ['Status', stateLabels[state]],
    ['Approval', approvalBadgeText(ad)],
    ['Payment', paymentLabels[ad.paymentStatus] ?? ad.paymentStatus],
    ['Start date', formatDate(ad.startsAt)],
    ['End date', formatDate(ad.expiresAt)],
    ['Created', formatDate(ad.createdAt)],
  ]
  return (
    <Dialog open={Boolean(ad)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Advertisement Detail</DialogTitle>
        </DialogHeader>

        {ad.imageUrl && (
          <img
            src={getImageUrl(ad.imageUrl)}
            alt={ad.title || 'Advertisement'}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{ad.title || 'Draft advertisement'}</h3>
          {ad.content && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ad.content}</p>}
          {ad.announcementMessage && (
            <p className="whitespace-pre-wrap text-sm font-medium">{ad.announcementMessage}</p>
          )}
          {ad.sku && (
            <p className="text-sm">
              <span className="text-muted-foreground">SKU: </span>
              <span className="font-medium">{ad.sku}</span>
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
<div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="min-w-0 break-words text-right font-medium">{value}</span>
                </div>
            ))}
          {packageInfo && (
            <div className="flex justify-between gap-4 border-t pt-2">
              <span className="text-muted-foreground">Daily Rate</span>
              <span className="font-medium text-primary">{formatFee(packageInfo.dailyRate)} KS/day</span>
            </div>
          )}
        </div>

        {isRejectedReasonVisible(ad) && (
          <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{ad.rejectionReason}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function isRejectedReasonVisible(ad: Advertisement) {
  return ad.approvalStatus === 'rejected' && Boolean(ad.rejectionReason)
}

const stateLabels: Record<DisplayState, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  pending_approval: 'Pending Approval',
  expired: 'Expired',
  inactive: 'Inactive',
  rejected: 'Rejected',
  content_uploaded: 'Content Uploaded',
  draft: 'Draft',
}

const DRAFT_CACHE_PREFIX = 'ad-draft-cache:'

function loadDraftCache(adId: string): ContentForm | null {
  try {
    const raw = localStorage.getItem(DRAFT_CACHE_PREFIX + adId)
    return raw ? (JSON.parse(raw) as ContentForm) : null
  } catch {
    return null
  }
}

function persistDraftCache(adId: string, values: ContentForm) {
  try {
    // Every field is a plain string now, so the whole draft is serializable.
    localStorage.setItem(DRAFT_CACHE_PREFIX + adId, JSON.stringify(values))
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

function clearDraftCache(adId: string) {
  try {
    localStorage.removeItem(DRAFT_CACHE_PREFIX + adId)
  } catch {
    // Ignore storage failures.
  }
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
  // Earliest selectable start date for new uploads and resubmission: today +
  // 3 days (UTC day granularity, the same convention the backend getSchedule
  // uses). Today, tomorrow, and the day after tomorrow cannot be selected.
  const minStartsAtDate = new Date()
  minStartsAtDate.setUTCHours(0, 0, 0, 0)
  minStartsAtDate.setUTCDate(minStartsAtDate.getUTCDate() + 3)
  const minStartsAt = minStartsAtDate.toISOString().slice(0, 10)
  const minToday = minStartsAt
  const isNewUpload = !target?.title
  const isResubmit = target?.approvalStatus === 'rejected'
  const canSetSchedule = isNewUpload || !target?.startsAt || isResubmit || target?.paymentStatus === 'pending'
  const form = useForm<ContentForm>({
    resolver: zodResolver(isNewUpload ? uploadContentSchema : canSetSchedule ? resubmitContentSchema : contentSchema),
    defaultValues: {
      title: '',
      content: '',
      announcementMessage: '',
      startsAt: minStartsAt,
      imageUrl: '',
    },
  })
  const startsAt = form.watch('startsAt')
  const imageUrl = form.watch('imageUrl')
  // Preserves unsaved typed content per ad across cancel/reopen (and across
  // logout/login via localStorage) so edits are not lost before a successful
  // save.
  const draftCache = useRef<Record<string, ContentForm>>({})

  useEffect(() => {
    if (target) {
      const cached = draftCache.current[target.id] ?? loadDraftCache(target.id)
      form.reset(
        cached ?? {
          title: target.title,
          content: target.content ?? '',
          announcementMessage: target.announcementMessage,
          startsAt: target.startsAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
          imageUrl: target.imageUrl ?? '',
        },
      )
    }
  }, [target, form])

  if (!target) return null
  const handleClose = () => {
    draftCache.current[target.id] = form.getValues()
    persistDraftCache(target.id, form.getValues())
    onClose()
  }
  const durationDays = adPackage?.durationDays ?? 7
  const endDate = startsAt ? new Date(`${startsAt}T00:00:00.000Z`) : null
  if (endDate) endDate.setUTCDate(endDate.getUTCDate() + durationDays)
  const feeSummary = adPackage
    ? `Advertising Fee: ${formatFee(Number(adPackage.dailyRate) * durationDays)} KS · ${durationDays} days × ${formatFee(adPackage.dailyRate)} KS/day`
    : null
  const currentPreview = imageUrl ? getImageUrl(imageUrl) : null

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            draftCache.current = {}
            clearDraftCache(target.id)
          })}
        >
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
            <Label>Advertisement image{isNewUpload && ' (Required)'}</Label>
            <p className="text-xs text-muted-foreground">
              Choose an image from one of your products. Custom image uploads are not accepted.
            </p>
            <ProductImagePicker
              value={imageUrl}
              onChange={(next) => {
                form.clearErrors('imageUrl')
                form.setValue('imageUrl', next)
              }}
              error={form.formState.errors.imageUrl?.message as string | undefined}
            />
            {currentPreview && (
              <img src={currentPreview} alt="Advertisement preview" className="mt-2 aspect-video w-full rounded-lg object-cover" />
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
                min={isResubmit ? minToday : minStartsAt}
                disabled={!canSetSchedule}
                {...form.register('startsAt')}
              />
              {canSetSchedule && (
                <p className="text-xs text-muted-foreground">
                  {isResubmit
                    ? `Select a start date from ${minToday} (3 days from today) onward. The end date is recalculated automatically.`
                    : `Select a date from ${minStartsAt} (3 days from today) onward.`}
                </p>
              )}
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            {showSaveAndPay && onSaveAndPay && (
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  form.handleSubmit(async (values) => {
                    await onSaveAndPay(values)
                    draftCache.current = {}
                    clearDraftCache(target.id)
                  })()
                }
              >
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
