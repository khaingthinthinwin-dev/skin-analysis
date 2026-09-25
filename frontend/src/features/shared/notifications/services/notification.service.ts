import apiClient from '@/lib/api-client'
import type {
  NotificationItem,
  NotificationListMeta,
  NotificationListResponse,
} from '@/types/notification.types'

const EMPTY_META: NotificationListMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
}

// Controllers return `{ data: payload }` and the global
// TransformInterceptor wraps responses in `{ data }` once more, so the wire
// body can be `{ data: { data: payload } }`. Drill through `data` keys until
// the real payload is found.
function drill(body: unknown, key: string): unknown {
  let current: unknown = body
  for (let depth = 0; depth < 3; depth++) {
    if (current == null || typeof current !== 'object') return undefined
    const obj = current as Record<string, unknown>
    if (key in obj) return obj[key]
    if ('data' in obj) {
      current = obj.data
      continue
    }
    return undefined
  }
  return undefined
}

function extractList(body: unknown): NotificationListResponse {
  const found = drill(body, 'items')
  const items: NotificationItem[] = Array.isArray(found)
    ? (found as NotificationItem[])
    : []
  const meta = drill(body, 'meta')
  return {
    items,
    meta:
      meta != null && typeof meta === 'object'
        ? (meta as NotificationListMeta)
        : EMPTY_META,
  }
}

export const notificationService = {
  async getNotifications(params?: {
    page?: number
    limit?: number
    unreadOnly?: boolean
    type?: string
  }): Promise<NotificationListResponse> {
    const { type: _ignoredType, ...fetchParams } = params ?? {}
    const { data } = await apiClient.get('/notifications', { params: fetchParams })
    return extractList(data)
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const { data } = await apiClient.get('/notifications/unread-count')
    const count = drill(data, 'count')
    return { count: typeof count === 'number' ? count : 0 }
  },

  async markAsRead(id: string) {
    const { data } = await apiClient.patch(`/notifications/${id}/read`)
    return data.data ?? data
  },

  async markAllAsRead(): Promise<{ updated: number }> {
    const { data } = await apiClient.patch('/notifications/read-all')
    const updated = drill(data, 'updated')
    return { updated: typeof updated === 'number' ? updated : 0 }
  },
}
