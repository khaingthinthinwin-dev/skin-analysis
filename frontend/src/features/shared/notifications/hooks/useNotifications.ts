import { useContext } from 'react'
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

  const notifications = listData?.items ?? []

  const markAllAsReadMutation = useMutation(
    {
      mutationFn: () => notificationService.markAllAsRead(),
      onSuccess: () => {
        const readAt = new Date().toISOString()
        queryClient.setQueriesData<NotificationListResponse>(
          { queryKey: [...notificationKeys.all, 'list'], exact: false },
          (old) =>
            old
              ? {
                  ...old,
                  items: old.items.map((item) =>
                    item.isRead ? item : { ...item, isRead: true, readAt },
                  ),
                }
              : old,
        )
        queryClient.setQueryData<{ count: number }>(
          notificationKeys.unreadCount(),
          { count: 0 },
        )
      },
    },
    queryClient,
  )

  return {
    notifications,
    total: listData?.meta?.total ?? 0,
    unreadCount: unreadData?.count ?? 0,
    isLoading,
    isError,
    error,
    refetch,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  }
}