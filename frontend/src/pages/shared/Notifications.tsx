import {
  Bell,
  Store,
  BadgeCheck,
  BadgeX,
  Tag,
  ShoppingBag,
  Sparkles,
  Megaphone,
  CircleCheck,
  CircleX,
  Flag,
  MessageSquareText,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotifications } from '@/features/shared/notifications/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import type { NotificationItem } from '@/types/notification.types'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs)) return ''
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const ADMIN_NOTIFICATION_TYPES = new Set([
  'MERCHANT_REGISTERED',
  'NEW_MERCHANT_REGISTRATION',
  'MERCHANT_REGISTRATION',
  'MERCHANT_LICENSE_RESUBMITTED',
  'REVIEW_CREATED',
  'REVIEW_REPORTED',
  'NEW_REPORT',
  'AD_SUBMITTED',
])

const MERCHANT_REGISTRATION_TYPES = new Set([
  'MERCHANT_REGISTERED',
  'NEW_MERCHANT_REGISTRATION',
  'MERCHANT_REGISTRATION',
])

const MERCHANT_ADMIN_ACTION_TYPES = new Set([
  ...MERCHANT_REGISTRATION_TYPES,
  'MERCHANT_LICENSE_RESUBMITTED',
  'MERCHANT_STATUS_CHANGED',
  'MERCHANT_STATUS_REJECTED',
])

const MERCHANT_NOTIFICATION_TYPES = new Set([
  'MERCHANT_STATUS_CHANGED',
  'MERCHANT_APPROVED',
  'MERCHANT_REJECTED',
  'MERCHANT_STATUS_APPROVED',
  'MERCHANT_STATUS_REJECTED',
  'AD_APPROVED',
  'AD_REJECTED',
  'AD_ACTIVE',
  'AD_EXPIRED',
  'NEW_ADS_PACKAGE',
  'ADS_PACKAGE_UPDATED',
  'ORDER_PLACED',
])

const ORDER_NOTIFICATION_TYPES = new Set([
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'ORDER_STATUS_UPDATED',
])

// Advertisement review decisions the admin makes, and the submission that
// triggers them. AD_SUBMITTED goes to admins, AD_APPROVED / AD_REJECTED go back
// to the shop owner (written by AdminAdManagementService).
// A buyer reporting a review notifies every admin; they triage it alongside the
// rest of the review queue.
const REVIEW_REPORT_TYPES = new Set(['REVIEW_REPORTED', 'NEW_REPORT'])

// A buyer submitting a review notifies every admin; the review waits in the
// moderation queue until an admin approves or rejects it.
const REVIEW_SUBMISSION_TYPES = new Set(['REVIEW_CREATED'])

const AD_SUBMISSION_TYPES = new Set(['AD_SUBMITTED'])

const AD_DECISION_TYPES = new Set([
  'AD_APPROVED',
  'AD_REJECTED',
  'AD_ACTIVE',
  'AD_EXPIRED',
])

const MERCHANT_REJECTION_TEXT = 'Your business license has been rejected'

const ACCOUNT_DEACTIVATED_TYPES = new Set([
  'ACCOUNT_DEACTIVATED',
  'USER_DEACTIVATED',
])

const ACCOUNT_ACTIVATED_TYPES = new Set([
  'ACCOUNT_ACTIVATED',
  'USER_ACTIVATED',
])

function isAccountActivatedNotification(item: NotificationItem): boolean {
  const type = normalizeNotificationType(item.type)
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
  return (
    ACCOUNT_ACTIVATED_TYPES.has(type) ||
    text.includes('account activated') ||
    text.includes('your account has been activated')
  )
}

function isAccountDeactivatedNotification(item: NotificationItem): boolean {
  const type = normalizeNotificationType(item.type)
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
  return (
    ACCOUNT_DEACTIVATED_TYPES.has(type) ||
    text.includes('account deactivated') ||
    text.includes('your account has been deactivated')
  )
}

function normalizeNotificationType(rawType: string): string {
  return (rawType || '').trim().replace(/[.\s-]+/g, '_').toUpperCase()
}

function isAdminNotification(item: NotificationItem): boolean {
  return ADMIN_NOTIFICATION_TYPES.has(normalizeNotificationType(item.type))
}

function isMerchantSpecificNotification(item: NotificationItem): boolean {
  const type = normalizeNotificationType(item.type)
  const title = (item.title || '').trim().toLowerCase()
  return (
    MERCHANT_NOTIFICATION_TYPES.has(type) ||
    type.includes('MERCHANT_STATUS') ||
    title.includes('merchant approved') ||
    title.includes('merchant rejected')
  )
}

function isMerchantRejectedNotification(item: NotificationItem): boolean {
  const type = normalizeNotificationType(item.type)
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
  return (
    type === 'MERCHANT_REJECTED' ||
    (type.includes('MERCHANT_STATUS') && text.includes('reject')) ||
    text.includes('merchant rejected') ||
    text.includes('business license has been rejected')
  )
}

function getRejectionReason(item: NotificationItem | null): string | null {
  if (!item) return null
  const prefix = `${MERCHANT_REJECTION_TEXT}.`
  const message = item.message.trim()
  if (!message.toLowerCase().startsWith(prefix.toLowerCase())) return null
  const reason = message.slice(prefix.length).trim().replace(/^reason:\s*/i, '')
  return reason || null
}

function getDeactivationReason(item: NotificationItem | null): string | null {
  if (!item) return null
  const message = item.message.trim()
  const reasonMatch = message.match(/reason:\s*(.+)/i)
  return reasonMatch ? reasonMatch[1].trim() : null
}

function adminNotificationKey(item: NotificationItem): string {
  const type = normalizeNotificationType(item.type)
  if (MERCHANT_REGISTRATION_TYPES.has(type) && item.entityId) {
    return `merchant-registration:${item.entityId}`
  }
  return item.id
}

function isAdSubmission(item: NotificationItem): boolean {
  return AD_SUBMISSION_TYPES.has(normalizeNotificationType(item.type))
}

function isAdRejected(item: NotificationItem): boolean {
  const type = normalizeNotificationType(item.type)
  if (type === 'AD_REJECTED') return true
  if (!AD_DECISION_TYPES.has(type)) return false
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
  return text.includes('reject')
}

// Trailing hint on ad notifications pointing at where the action happens:
// admins review the submission, merchants see the decision on their ads.
function adActionHint(item: NotificationItem): string | null {
  if (isAdSubmission(item)) return 'Review in Advertisement Management →'
  const type = normalizeNotificationType(item.type)
  if (AD_DECISION_TYPES.has(type)) {
    return isAdRejected(item)
      ? 'Edit & Resubmit from Advertisements →'
      : 'View in Advertisements →'
  }
  return null
}

function orderActionHint(item: NotificationItem): string | null {
  return ORDER_NOTIFICATION_TYPES.has(normalizeNotificationType(item.type))
    ? 'View order →'
    : null
}

// Order Insight notifications travel between the merchant and the buyer
// (ORDER_PLACED → merchant; ORDER_CONFIRMED / ORDER_STATUS_UPDATED → buyer,
// plus seeded `order` items). Once the recipient has read one, it leaves the
// list entirely instead of lingering as a "read" card.
function isReadOrderInsightNotification(item: NotificationItem): boolean {
  if (!item.isRead) return false
  const type = normalizeNotificationType(item.type)
  return type === 'ORDER' || ORDER_NOTIFICATION_TYPES.has(type)
}

// Review notifications deep-link straight to the queue entry they are about so
// the admin does not have to hunt for it. `entityId` is the review id for a
// REVIEW_CREATED notification and the report id for a REVIEW_REPORTED one
// (see products.service.ts / reviews.service.ts).
function reviewManagementPath(item: NotificationItem): string {
  const type = normalizeNotificationType(item.type)
  const tab = REVIEW_REPORT_TYPES.has(type) ? 'reports' : 'reviews'
  const highlight = item.entityId
    ? `&highlight=${encodeURIComponent(item.entityId)}`
    : ''
  return `/admin/reviews?tab=${tab}${highlight}`
}

function iconForType(rawType: string, title?: string, message?: string) {
  const type = (rawType || '').toUpperCase()
  if (ACCOUNT_ACTIVATED_TYPES.has(type) || type.includes('ACCOUNT_ACTIVATED') || type.includes('USER_ACTIVATED')) {
    return { Icon: BadgeCheck, color: 'text-emerald-500' }
  }
  if (ACCOUNT_DEACTIVATED_TYPES.has(type) || type.includes('ACCOUNT_DEACTIVATED') || type.includes('USER_DEACTIVATED')) {
    return { Icon: BadgeX, color: 'text-destructive' }
  }
  if (type === 'MERCHANT_STATUS_CHANGED' || type.includes('MERCHANT_STATUS')) {
    const haystack = `${title ?? ''} ${message ?? ''}`.toLowerCase()
    if (haystack.includes('reject')) {
      return { Icon: BadgeX, color: 'text-red-500' }
    }
    return { Icon: BadgeCheck, color: 'text-emerald-500' }
  }
  if (type === 'MERCHANT_REGISTERED' || type.includes('MERCHANT')) {
    return { Icon: Store, color: 'text-sky-500' }
  }
  if (type === 'NEW_ADS_PACKAGE' || type === 'ADS_PACKAGE_UPDATED') {
    return { Icon: Tag, color: 'text-purple-600' }
  }
  if (type.includes('AD_')) {
    const haystack = `${type} ${title ?? ''} ${message ?? ''}`.toLowerCase()
    if (haystack.includes('reject')) {
      return { Icon: CircleX, color: 'text-red-500' }
    }
    if (haystack.includes('approve') || haystack.includes('active')) {
      return { Icon: CircleCheck, color: 'text-emerald-500' }
    }
    return { Icon: Megaphone, color: 'text-purple-600' }
  }
  if (type === 'REVIEW_CREATED' || type.includes('REVIEW_CREATED')) {
    return { Icon: MessageSquareText, color: 'text-sky-600' }
  }
  if (REVIEW_REPORT_TYPES.has(type) || type.includes('REVIEW_REPORT')) {
      return { Icon: Flag, color: 'text-amber-600' }
    }
    if (type === 'ORDER' || type.includes('ORDER')) {
      return { Icon: ShoppingBag, color: 'text-emerald-500' }
    }
  if (type === 'PROMO' || type.includes('PROMO')) {
    return { Icon: Tag, color: 'text-purple-600' }
  }
  if (type === 'SKIN_CHECK_REMINDER') {
    return { Icon: Sparkles, color: 'text-pink-500' }
  }
  if (type === 'ANALYSIS' || type.includes('ANALYSIS') || type.includes('SKIN')) {
    return { Icon: Sparkles, color: 'text-pink-500' }
  }
  return { Icon: Bell, color: 'text-muted-foreground' }
}

function NotificationCard({
  item,
  onOpen,
  isAdmin = false,
}: {
  item: NotificationItem
  onOpen: (item: NotificationItem) => void
  isAdmin?: boolean
}) {
  const { Icon, color } = iconForType(item.type, item.title, item.message)
  const isMerchantReg = MERCHANT_ADMIN_ACTION_TYPES.has(
    normalizeNotificationType(item.type),
  )
  const adHint = adActionHint(item)
  const normalizedType = normalizeNotificationType(item.type)
  const approvedProductId =
    normalizedType === 'REVIEW_APPROVED' && item.entityType === 'Product'
      ? item.entityId
      : null
  const reportHint = REVIEW_REPORT_TYPES.has(normalizedType)
    ? 'Review in Review Management →'
    : REVIEW_SUBMISSION_TYPES.has(normalizedType)
      ? 'Moderate in Review Management →'
      : null
  const orderHint = orderActionHint(item)
  const displayMessage = isMerchantRejectedNotification(item)
    ? MERCHANT_REJECTION_TEXT
    : item.message

  return (
    <Card
      className={`border-border/80 shadow-xs transition-colors ${
        item.isRead ? '' : 'border-purple-500/40 bg-purple-500/5'
      }`}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-xl bg-muted/60 ${color} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="w-full text-left cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {item.title}
                {!item.isRead && (
                  <span className="h-2 w-2 rounded-full bg-purple-500" aria-label="Unread" />
                )}
              </h3>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {timeAgo(item.createdAt)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{displayMessage}</p>
            {isAdmin && isMerchantReg && (
              <p className="text-xs font-semibold text-purple-600 underline hover:text-purple-700 cursor-pointer">
                View in Merchant Management →
              </p>
            )}
            {adHint && (
              <p className="text-xs font-semibold text-purple-600">{adHint}</p>
            )}
            {isAdmin && reportHint && (
              <p className="text-xs font-semibold text-purple-600">{reportHint}</p>
            )}
            {orderHint && (
              <p className="text-xs font-semibold text-purple-600">{orderHint}</p>
            )}
          </button>
          {approvedProductId && (
            <Link
              to={`/buyer/products/${encodeURIComponent(approvedProductId)}#reviews`}
              onClick={() => onOpen(item)}
              className="block text-xs font-semibold text-purple-600 hover:underline"
            >
              View your review →
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const [rejectedNotification, setRejectedNotification] = useState<NotificationItem | null>(null)
  const [deactivatedNotification, setDeactivatedNotification] = useState<NotificationItem | null>(null)

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications({ unreadOnly: true })

  const displayedNotifications = useMemo(() => {
    // Order Insight notifications between merchant and buyer disappear as
    // soon as they are read; every other type keeps its normal behavior.
    const withoutReadOrderInsights = notifications.filter(
      (item) => !isReadOrderInsightNotification(item),
    )

    if (isAdmin) {
      const seenKeys = new Set<string>()
      return withoutReadOrderInsights.filter((item) => {
        if (!isAdminNotification(item)) {
          return false
        }
        const key = adminNotificationKey(item)
        if (seenKeys.has(key)) {
          return false
        }
        seenKeys.add(key)
        return true
      })
    }

    if (user?.role === 'merchant') {
      return withoutReadOrderInsights.filter(
        (item) => !isMerchantSpecificNotification(item) || item.userId === user.id,
      )
    }

    return withoutReadOrderInsights
  }, [isAdmin, notifications, user])

  const rejectionReason = getRejectionReason(rejectedNotification)
  const deactivationReason = getDeactivationReason(deactivatedNotification)

  const handleOpen = (item: NotificationItem) => {
    // Every notification the user opens leaves the history list, whether it was
    // still unread or not, so the same item is never acted on twice.
    markAsRead(item.id).catch(() => {})
    if (isMerchantRejectedNotification(item)) {
      setRejectedNotification(item)
      return
    }
    if (isAccountActivatedNotification(item)) {
      const profilePath = user?.role === 'buyer' ? '/buyer/profile' : '/merchant/profile'
      navigate(profilePath)
      return
    }
    if (isAccountDeactivatedNotification(item)) {
      setDeactivatedNotification(item)
      return
    }
    const type = normalizeNotificationType(item.type)
    // Admin-only routes - only navigate if user is admin
    if (AD_SUBMISSION_TYPES.has(type)) {
      if (!isAdmin) return
      // Admins act here: jump straight to the review queue. Highlight the specific ad if entityId is available.
      // Don't filter by status - show all ads so admin can see the highlighted ad in context
      if (item.entityId) {
        navigate(`/admin/ads?highlightAdId=${item.entityId}`)
      } else {
        navigate('/admin/ads')
      }
      return
    }
    if (REVIEW_REPORT_TYPES.has(type) || REVIEW_SUBMISSION_TYPES.has(type)) {
      // Admins triage reports and moderate submissions on the Reviews page.
      // The specific row is highlighted so it is easy to spot.
      navigate(reviewManagementPath(item))
      return
    }
    if (MERCHANT_ADMIN_ACTION_TYPES.has(type)) {
      if (!isAdmin) return
      // Navigate to admin merchants page with merchantId to highlight the row
      if (item.entityId) {
        navigate(`/admin/merchants?merchantId=${item.entityId}`)
      } else {
        navigate('/admin/merchants')
      }
      return
    }

     // Skin analysis notifications
    if ((type === 'ANALYSIS' || type.includes('ANALYSIS') || type.includes('SKIN')) && item.entityId && type !== 'SKIN_CHECK_REMINDER') {
      navigate(`/buyer/skin-analysis/${item.entityId}`)
      return
    }
    if (type === 'ANALYSIS' || type.includes('ANALYSIS') || type.includes('SKIN')) {
      navigate('/buyer/skin-analysis')
      return
    }
    // Skin check reminder - link to new analysis page
    if (type === 'SKIN_CHECK_REMINDER') {
      navigate('/buyer/skin-analysis/new')
      return
    }
    // Merchant/buyer routes - navigate based on user role
    if (AD_DECISION_TYPES.has(type)) {
      // Decisions are only ever addressed to the merchant who owns the ad.
      // Highlight the specific advertisement if entityId is available.
      if (item.entityId) {
        navigate(`/merchant/advertisements?highlightAdId=${item.entityId}`)
      } else {
        navigate('/merchant/advertisements')
      }
      return
    }
    const adPackageTypes = new Set(['NEW_ADS_PACKAGE', 'ADS_PACKAGE_UPDATED'])
    if (adPackageTypes.has(type) && item.entityId) {
      // Navigate to ads page and highlight the updated package
      navigate(`/merchant/advertisements?updatedPackage=${item.entityId}`)
      return
    }
    if (ORDER_NOTIFICATION_TYPES.has(type) && item.entityId) {
      const basePath =
        user?.role === 'merchant'
          ? '/merchant'
          : user?.role === 'admin' || user?.role === 'super_admin'
            ? '/admin'
            : ''
      navigate(`${basePath}/orders/${item.entityId}`)
      return
    }
    // Merchant account approved - only mark as read, no navigation
    if (type === 'MERCHANT_APPROVED' || type === 'MERCHANT_STATUS_APPROVED') {
      return
    }
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-purple-600" /> Notifications Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Your latest account and order updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={isMarkingAllRead}
            onClick={() => markAllAsRead().catch(() => {})}
          >
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading notifications">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="border-border/80 shadow-xs">
              <CardContent className="p-4 flex items-start gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load notifications. Please try again.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : displayedNotifications.length === 0 ? (
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-8 text-center space-y-2">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              New merchant registrations and moderation events will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((item) => (
            <NotificationCard key={item.id} item={item} onOpen={handleOpen} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      <Dialog
        open={rejectedNotification !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectedNotification(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejection details</DialogTitle>
            <DialogDescription>{MERCHANT_REJECTION_TEXT}</DialogDescription>
          </DialogHeader>
          {rejectionReason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                Rejection reason
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{rejectionReason}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Review your Store Profile before resubmitting your application.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectedNotification(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setRejectedNotification(null)
                navigate('/merchant/profile')
              }}
            >
              Resubmit from Store Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deactivatedNotification !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatedNotification(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Deactivated</DialogTitle>
            <DialogDescription>Your account has been deactivated by an administrator</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
              Account Status
            </p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              Your account has been deactivated. Some features may be restricted until an admin
              reactivates your account.
            </p>
          </div>
          {deactivationReason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 mt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                Deactivation Reason
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{deactivationReason}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Please contact support or visit your profile for more information.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivatedNotification(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDeactivatedNotification(null)
                const profilePath =
                  user?.role === 'buyer'
                    ? '/dashboard/profile'
                    : user?.role === 'merchant'
                    ? '/merchant/profile'
                    : '/profile'
                navigate(profilePath)
              }}
            >
              Go to Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}