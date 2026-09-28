import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { useNotifications } from './useNotifications'
import { useAuth } from '@/hooks/useAuth'
import type { NotificationItem } from '@/types/notification.types'

const NOTIFIED_IDS_KEY = 'merchant-status-notified-ids'

function readNotifiedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(NOTIFIED_IDS_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function persistNotifiedIds(ids: Set<string>) {
  try {
    const arr = Array.from(ids).slice(-50)
    window.localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(arr))
  } catch {
    // storage unavailable (private mode / tests) — alerts still work in-memory
  }
}

function statusOf(item: NotificationItem): 'approved' | 'rejected' | null {
  const haystack = `${item.title} ${item.message}`.toLowerCase()
  if (haystack.includes('reject')) return 'rejected'
  if (haystack.includes('approv')) return 'approved'
  return null
}

/**
 * In-app alert for merchants when admin approves/rejects their account.
 * - Watches MERCHANT_STATUS_CHANGED notifications (polled by useNotifications).
 * - Shows a sonner toast once per notification id.
 * - Refreshes auth user so `licenseStatus` banners update without reload.
 */
export function useMerchantStatusAlerts() {
  const { user, refreshUser } = useAuth()
  const { notifications } = useNotifications()
  const toastedRef = useRef<Set<string> | null>(null)
  const refreshingRef = useRef(false)

  const statusChanges = useMemo(
    () => notifications.filter((n) => n.type === 'MERCHANT_STATUS_CHANGED'),
    [notifications],
  )

  const latestStatusChange = statusChanges[0] ?? null

  useEffect(() => {
    if (user?.role !== 'merchant') return
    if (statusChanges.length === 0) return
    if (!toastedRef.current) {
      toastedRef.current = readNotifiedIds()
    }

    const fresh = statusChanges.filter(
      (n) => !n.isRead && !toastedRef.current!.has(n.id) && statusOf(n) !== null,
    )
    if (fresh.length === 0) return

    let needsRefresh = false
    for (const item of fresh) {
      const status = statusOf(item)
      if (!status) continue
      toastedRef.current.add(item.id)
      needsRefresh = true
      if (status === 'approved') {
        toast.success(item.title || 'Merchant Approved', {
          description: item.message,
          duration: 8000,
        })
      } else {
        toast.error(item.title || 'Merchant Rejected', {
          description: item.message,
          duration: 10000,
        })
      }
    }
    persistNotifiedIds(toastedRef.current)

    if (needsRefresh && !refreshingRef.current) {
      refreshingRef.current = true
      refreshUser()
        .catch(() => {})
        .finally(() => {
          refreshingRef.current = false
        })
    }
  }, [user?.role, statusChanges, refreshUser])

  return { statusChanges, latestStatusChange }
}
