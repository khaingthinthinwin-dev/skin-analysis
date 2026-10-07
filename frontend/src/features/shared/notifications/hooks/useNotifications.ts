import { useContext, useMemo } from 'react'
import {
  useQuery,
  useMutation,
  QueryClientContext,
  QueryClient,
} from '@tanstack/react-query'
import { notificationService } from '../services/notification.service'
import type { NotificationListResponse } from '@/types/notification.types'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

// Opening a notification removes it from the history list. The server only
// records `readAt`, it keeps the row, so dismissed ids are remembered for the
// browser session and filtered back out of every later refetch.
const DISMISSED_STORAGE_KEY = 'notifications-dismissed-ids'
const DISMISSED_LIMIT = 200

function readDismissedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) ?? '[]',
    )
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function rememberDismissed(ids: string[]) {
  if (ids.length === 0 || typeof window === 'undefined') return
  try {
    const next = [
      ...readDismissedIds().filter((existing) => !ids.includes(existing)),
      ...ids,
    ].slice(-DISMISSED_LIMIT)
    window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // sessionStorage can be unavailable (private mode, quota). The cache
    // update already removed the row for the current session.
  }
}

function removeFromCachedLists(queryClient: QueryClient, ids: string[]) {
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: [...notificationKeys.all, 'list'], exact: false },
    (old) => {
      if (!old) return old
      const items = old.items.filter((item) => !ids.includes(item.id))
      const removed = old.items.length - items.length
      if (removed === 0) return old
      return {
        ...old,
        items,
        meta: old.meta
          ? { ...old.meta, total: Math.max(0, old.meta.total - removed) }
          : old.meta,
      }
    },
  )
}

const fallbackClient = new QueryClient({
  defaultOptions: {
    queries: {
      enabled: false,
      retry: false,
    },
  },
})

function hasAccessToken() {
  return typeof window !== 'undefined' && !!window.localStorage.getItem('accessToken')
}

export function useNotifications(params?: {
  limit?: number
  unreadOnly?: boolean
  type?: string
}) {
  const clientInContext = useContext(QueryClientContext)
  const queryClient = clientInContext ?? fallbackClient

  const limit = params?.limit ?? 50
  const unreadOnly = params?.unreadOnly ?? false

  const {
    data: listData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    {
      queryKey: [...notificationKeys.list(), { limit, unreadOnly }],
      queryFn: () =>
        notificationService.getNotifications(
          unreadOnly ? { limit, unreadOnly: true } : { limit },
        ),
      enabled: Boolean(clientInContext && hasAccessToken()),
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    queryClient,
  )

  const { data: unreadData } = useQuery(
    {
      queryKey: notificationKeys.unreadCount(),
      queryFn: () => notificationService.getUnreadCount(),
      enabled: Boolean(clientInContext && hasAccessToken()),
      staleTime: 30 * 1000,
      refetchInterval: 15 * 1000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    queryClient,
  )

  const markAsReadMutation = useMutation(
    {
      mutationFn: (id: string) => notificationService.markAsRead(id),
      // Optimistic: the row leaves the visible history the moment it is opened
      // instead of waiting for the round-trip.
      onMutate: (id) => {
        const cachedLists = queryClient.getQueriesData<NotificationListResponse>(
          { queryKey: [...notificationKeys.all, 'list'], exact: false },
        )
        let wasUnread = false
        for (const [, cached] of cachedLists) {
          const match = cached?.items?.find((item) => item.id === id)
          if (match) {
            wasUnread = !match.isRead
            break
          }
        }
        removeFromCachedLists(queryClient, [id])
        rememberDismissed([id])
        if (wasUnread) {
          queryClient.setQueryData<{ count: number }>(
            notificationKeys.unreadCount(),
            (old) => (old ? { count: Math.max(0, old.count - 1) } : old),
          )
        }
      },
      onError: () => {
        // The removal could not be confirmed, so re-sync with the server
        // instead of leaving the list out of sync.
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      },
    },
    queryClient,
  )

  const markAllAsReadMutation = useMutation(
    {
      mutationFn: () => notificationService.markAllAsRead(),
      onSuccess: () => {
        const cachedLists = queryClient.getQueriesData<NotificationListResponse>(
          { queryKey: [...notificationKeys.all, 'list'], exact: false },
        )
        const ids = cachedLists.flatMap(([, cached]) =>
          (cached?.items ?? []).map((item) => item.id),
        )
        removeFromCachedLists(queryClient, ids)
        rememberDismissed(ids)
        queryClient.setQueryData<{ count: number }>(
          notificationKeys.unreadCount(),
          (old) => (old ? { count: 0 } : old),
        )
      },
    },
    queryClient,
  )

  const notifications = useMemo(() => {
    const items = listData?.items ?? []
    const dismissed = new Set(readDismissedIds())
    return dismissed.size === 0
      ? items
      : items.filter((item) => !dismissed.has(item.id))
  }, [listData])

  return {
    notifications,
    total: listData?.meta?.total ?? 0,
    unreadCount: unreadData?.count ?? 0,
    isLoading,
    isError,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  }
}