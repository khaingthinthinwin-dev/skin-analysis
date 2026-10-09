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

function markAsReadInCachedLists(queryClient: QueryClient, id: string) {
  const now = new Date().toISOString()
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: [...notificationKeys.all, 'list'], exact: false },
    (old) => {
      if (!old) return old
      const items = old.items.map((item) =>
        item.id === id ? { ...item, isRead: true, readAt: now } : item,
      )
      return { ...old, items }
    },
  )
}

function markAllAsReadInCachedLists(queryClient: QueryClient) {
  const now = new Date().toISOString()
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: [...notificationKeys.all, 'list'], exact: false },
    (old) => {
      if (!old) return old
      const items = old.items.map((item) =>
        item.isRead ? item : { ...item, isRead: true, readAt: now },
      )
      return { ...old, items }
    },
  )
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
        markAsReadInCachedLists(queryClient, id)
        if (wasUnread) {
          queryClient.setQueryData<{ count: number }>(
            notificationKeys.unreadCount(),
            (old) => (old ? { count: Math.max(0, old.count - 1) } : old),
          )
        }
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      },
    },
    queryClient,
  )

  const markAllAsReadMutation = useMutation(
    {
      mutationFn: () => notificationService.markAllAsRead(),
      onSuccess: () => {
        markAllAsReadInCachedLists(queryClient)
        queryClient.setQueryData<{ count: number }>(
          notificationKeys.unreadCount(),
          (old) => (old ? { count: 0 } : old),
        )
      },
    },
    queryClient,
  )

  const notifications = useMemo(() => {
    return listData?.items ?? []
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