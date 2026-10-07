import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Notifications from './Notifications'
import { notificationService } from '@/features/shared/notifications/services/notification.service'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let mockRole: string = 'admin'
let mockUserId: string = 'user-1'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: mockUserId, name: 'Test User', email: 'test@example.com', role: mockRole },
    refreshUser: vi.fn(),
  }),
}))

vi.mock('@/features/shared/notifications/services/notification.service', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

describe('Notifications Center', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockRole = 'admin'
    mockUserId = 'user-1'
    localStorage.setItem('accessToken', 'mock-admin-token')
    window.sessionStorage.removeItem('notifications-dismissed-ids')
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  it('shows only relevant admin notifications and collapses duplicate registrations', async () => {
    const mockNotifications = [
      {
        id: 'n-1',
        userId: 'admin-1',
        type: 'MERCHANT_REGISTERED',
        title: 'New merchant registration',
        message: 'Glow Beauty registered and is pending approval.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-2',
        userId: 'admin-1',
        type: 'MERCHANT_REGISTERED',
        title: 'New merchant registration',
        message: 'Glow Beauty registered and is pending approval.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-3',
        userId: 'admin-1',
        type: 'AD_SUBMITTED',
        title: 'New advertisement submitted',
        message: 'A new advertisement is pending review.',
        entityType: 'advertisement',
        entityId: 'ad-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-resubmitted',
        userId: 'admin-1',
        type: 'MERCHANT_LICENSE_RESUBMITTED',
        title: 'Merchant license resubmitted',
        message: 'Glow Beauty uploaded a new business license and is pending approval.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-4',
        userId: 'buyer-1',
        type: 'order',
        title: 'Order Placed',
        message: 'Order #ORD-1001 was placed by customer.',
        entityType: 'order',
        entityId: 'o-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-5',
        userId: 'merchant-1',
        type: 'promo',
        title: 'Summer Promotion Active',
        message: 'Promotion SUMMER20 is now active.',
        entityType: 'promotion',
        entityId: 'p-1',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      meta: { total: 6, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({
      count: 2,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        limit: 50,
      })
    })

    expect(screen.getByText('Notifications Center')).toBeInTheDocument()
    expect(await screen.findByText('New merchant registration')).toBeInTheDocument()
    expect(screen.getAllByText('New merchant registration')).toHaveLength(1)
    expect(await screen.findByText('New advertisement submitted')).toBeInTheDocument()
    expect(await screen.findByText('Merchant license resubmitted')).toBeInTheDocument()
    expect(screen.queryByText('Order Placed')).not.toBeInTheDocument()
    expect(screen.queryByText('Summer Promotion Active')).not.toBeInTheDocument()
    expect((await screen.findAllByText('View in Merchant Management →')).length).toBeGreaterThan(0)
  })

  it('excludes merchant-specific notifications like "Merchant Approved" in the admin panel', async () => {
    mockRole = 'admin'
    const mockNotifications = [
      {
        id: 'n-1',
        userId: 'admin-1',
        type: 'MERCHANT_REGISTERED',
        title: 'New merchant registration',
        message: 'Glow Beauty registered and is pending approval.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-2',
        userId: 'merchant-1',
        type: 'MERCHANT_STATUS_CHANGED',
        title: 'Merchant Approved',
        message: 'Your shop "Glow Beauty" has been approved.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-3',
        userId: 'merchant-2',
        type: 'merchant.approved',
        title: 'Account approved',
        message: 'Your shop "Glow Beauty" has been approved.',
        entityType: 'merchant',
        entityId: 'm-2',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ]

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({
      count: 3,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Admin should see merchant registration
    expect(await screen.findByText('New merchant registration')).toBeInTheDocument()
    expect(screen.queryByText('Merchant Approved')).not.toBeInTheDocument()
    expect(screen.queryByText('Account approved')).not.toBeInTheDocument()
  })

  it('displays "Merchant Approved" notification for the target merchant', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    const mockNotifications = [
      {
        id: 'n-2',
        userId: 'merchant-1',
        type: 'MERCHANT_STATUS_CHANGED',
        title: 'Merchant Approved',
        message: 'Your shop "Glow Beauty" has been approved.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-3',
        userId: 'merchant-2',
        type: 'MERCHANT_STATUS_CHANGED',
        title: 'Merchant Rejected',
        message: 'Another merchant application was rejected.',
        entityType: 'merchant',
        entityId: 'm-2',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ]

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({
      count: 2,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/merchant/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Target merchant SHOULD see "Merchant Approved"
    expect(await screen.findByText('Merchant Approved')).toBeInTheDocument()
    expect(screen.getByText('Your shop "Glow Beauty" has been approved.')).toBeInTheDocument()
    expect(screen.queryByText('Merchant Rejected')).not.toBeInTheDocument()
  })

  it('opens rejection details and navigates to the Store Profile', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    const mockNotifications = [
      {
        id: 'n-rejected',
        userId: 'merchant-1',
        type: 'MERCHANT_STATUS_CHANGED',
        title: 'Merchant Rejected',
        message: 'Your business license has been rejected. Reason: Invalid license.',
        entityType: 'merchant',
        entityId: 'm-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ]

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({
      count: 1,
    })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      id: 'n-rejected',
      isRead: true,
    })

    function LocationProbe() {
      const location = useLocation()
      return <div data-testid="location">{location.pathname}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/merchant/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Merchant Rejected')).toBeInTheDocument()
    expect(screen.getByText('Your business license has been rejected')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Merchant Rejected'))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Rejection details')
    expect(dialog).toHaveTextContent('Your business license has been rejected')
    expect(dialog).toHaveTextContent('Invalid license')
    expect(
      screen.getByRole('button', { name: 'Resubmit from Store Profile' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resubmit from Store Profile' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/merchant/profile')
    })
  })

  it('marks unread notification as read on click', async () => {
    const mockNotifications = [
      {
        id: 'n-1',
        userId: 'admin-1',
        type: 'AD_SUBMITTED',
        title: 'New advertisement submitted',
        message: 'A new advertisement is pending review.',
        entityType: 'advertisement',
        entityId: 'ad-99',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ]

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({
      count: 1,
    })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({ id: 'n-1', isRead: true })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('New advertisement submitted')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New advertisement submitted'))

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('n-1')
    })
  })

  it('deep-links a review submission to the highlighted Review Management row', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-review',
          userId: 'admin-1',
          type: 'REVIEW_CREATED',
          title: 'New review submitted',
          message: 'A 5-star review for "Serum" was submitted and is pending moderation.',
          entityType: 'Review',
          entityId: 'rev-7',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      id: 'n-review',
      isRead: true,
    })

    function LocationProbe() {
      const location = useLocation()
      return (
        <div data-testid="location">
          {location.pathname}
          {location.search}
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Moderate in Review Management →')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New review submitted'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/admin/reviews?tab=reviews&highlight=rev-7',
      )
    })
  })

  it('deep-links a reported review to the reports tab', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-report',
          userId: 'admin-1',
          type: 'REVIEW_REPORTED',
          title: 'Review reported',
          message: 'A review was reported as "Spam" and is pending moderation.',
          entityType: 'ReviewReport',
          entityId: 'rep-3',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      id: 'n-report',
      isRead: true,
    })

    function LocationProbe() {
      const location = useLocation()
      return (
        <div data-testid="location">
          {location.pathname}
          {location.search}
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Review in Review Management →')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Review reported'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/admin/reviews?tab=reports&highlight=rep-3',
      )
    })
  })

  it('removes an opened notification from the history list, even if it was already read', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-read',
          userId: 'admin-1',
          type: 'MERCHANT_REGISTERED',
          title: 'New merchant registration',
          message: 'Glow Beauty registered and is pending approval.',
          entityType: 'merchant',
          entityId: 'm-1',
          isRead: true,
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 0 })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      id: 'n-read',
      isRead: true,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('New merchant registration')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New merchant registration'))

    await waitFor(() => {
      expect(screen.queryByText('New merchant registration')).not.toBeInTheDocument()
    })
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    expect(notificationService.markAsRead).toHaveBeenCalledWith('n-read')
  })

  it('keeps a dismissed notification out of the list after a refetch', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-sticky',
          userId: 'admin-1',
          type: 'MERCHANT_REGISTERED',
          title: 'New merchant registration',
          message: 'Glow Beauty registered and is pending approval.',
          entityType: 'merchant',
          entityId: 'm-1',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      id: 'n-sticky',
      isRead: true,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('New merchant registration')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New merchant registration'))

    await waitFor(() => {
      expect(screen.queryByText('New merchant registration')).not.toBeInTheDocument()
    })

    // The server still returns the row (it only records readAt); it must not
    // come back into the visible history.
    await queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByText('New merchant registration')).not.toBeInTheDocument()
  })
})
