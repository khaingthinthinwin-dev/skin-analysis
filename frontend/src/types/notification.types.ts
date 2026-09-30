export interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface NotificationListResponse {
  items: NotificationItem[]
  meta: NotificationListMeta
}
