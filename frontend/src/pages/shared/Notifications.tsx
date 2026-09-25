import {
  Bell,
  Store,
  BadgeCheck,
  BadgeX,
  Tag,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
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
])

const MERCHANT_REJECTION_TEXT = 'Your business license has been rejected'

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

function adminNotificationKey(item: NotificationItem): string {
  const type = normalizeNotificationType(item.type)
  if (MERCHANT_REGISTRATION_TYPES.has(type) && item.entityId) {
    return `merchant-registration:${item.entityId}`
  }
  return item.id
}

function iconForType(rawType: string, title?: string, message?: string) {
  const type = (rawType || '').toUpperCase()
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
  if (type === 'ORDER' || type.includes('ORDER')) {
    return { Icon: ShoppingBag, color: 'text-emerald-500' }
  }
  if (type === 'PROMO' || type.includes('PROMO')) {
    return { Icon: Tag, color: 'text-purple-600' }
  }
  if (type === 'ANALYSIS' || type.includes('ANALYSIS') || type.includes('SKIN')) {
    return { Icon: Sparkles, color: 'text-pink-500' }
  }
  return { Icon: Bell, color: 'text-muted-foreground' }
}

function NotificationCard({
  item,
  onOpen,
}: {
  item: NotificationItem
  onOpen: (item: NotificationItem) => void
}) {
  const { Icon, color } = iconForType(item.type, item.title, item.message)
  const isMerchantReg = MERCHANT_ADMIN_ACTION_TYPES.has(
    normalizeNotificationType(item.type),
  )
  const displayMessage = isMerchantRejectedNotification(item)
    ? MERCHANT_REJECTION_TEXT
    : item.message

  return (
    <Card
      className={`border-border/80 shadow-xs transition-colors ${
        item.isRead ? '' : 'border-purple-500/40 bg-purple-500/5'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="w-full text-left cursor-pointer"
      >
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`p-2 rounded-xl bg-muted/60 ${color} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
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
            {isMerchantReg && (
              <p className="text-xs font-semibold text-purple-600">
                View in Merchant Management →
              </p>
            )}
          </div>
        </CardContent>
      </button>
    </Card>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    location.pathname.startsWith('/admin')
  const [rejectedNotification, setRejectedNotification] = useState<NotificationItem | null>(null)

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications()

  const displayedNotifications = useMemo(() => {
    if (isAdmin) {
      const seenKeys = new Set<string>()
      return notifications.filter((item) => {
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
      return notifications.filter(
        (item) => !isMerchantSpecificNotification(item) || item.userId === user.id,
      )
    }

    return notifications
  }, [isAdmin, notifications, user])

  const rejectionReason = getRejectionReason(rejectedNotification)

  const handleOpen = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead(item.id).catch(() => {})
    }
    if (isMerchantRejectedNotification(item)) {
      setRejectedNotification(item)
      return
    }
    const type = normalizeNotificationType(item.type)
    if (MERCHANT_ADMIN_ACTION_TYPES.has(type)) {
      navigate('/admin/merchants')
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
            Stay updated on merchant registrations and moderation events
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
            <NotificationCard key={item.id} item={item} onOpen={handleOpen} />
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
    </div>
  )
}