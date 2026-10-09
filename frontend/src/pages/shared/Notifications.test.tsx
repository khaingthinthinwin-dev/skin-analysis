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
        unreadOnly: true,
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

  it('hides read Order Insight notifications for the merchant but keeps unread ones', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    const mockNotifications = [
      {
        id: 'n-order-unread',
        userId: 'merchant-1',
        type: 'ORDER_PLACED',
        title: 'New order received',
        message: 'A buyer placed order ORD-0000001.',
        entityType: 'order',
        entityId: 'o-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-order-read',
        userId: 'merchant-1',
        type: 'ORDER_PLACED',
        title: 'New order received',
        message: 'A buyer placed order ORD-0000002.',
        entityType: 'order',
        entityId: 'o-2',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-status-read',
        userId: 'merchant-1',
        type: 'ORDER_STATUS_UPDATED',
        title: 'Order Shipped',
        message: 'Your order ORD-0000003 is now shipped.',
        entityType: 'order',
        entityId: 'o-3',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-promo-read',
        userId: 'merchant-1',
        type: 'promo',
        title: 'Merchant Promo Active',
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
      meta: { total: 4, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/merchant/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Unread Order Insight notification stays visible…
    expect(await screen.findByText('New order received')).toBeInTheDocument()
    // …while read ones disappear (both ORDER_PLACED and ORDER_STATUS_UPDATED).
    expect(
      screen.queryByText('A buyer placed order ORD-0000002.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Order Shipped')).not.toBeInTheDocument()
    // Non-order notifications are unaffected even when read.
    expect(screen.getByText('Merchant Promo Active')).toBeInTheDocument()
  })

  it('hides read Order Insight notifications for the buyer but keeps unread ones', async () => {
    mockRole = 'buyer'
    mockUserId = 'buyer-1'
    const mockNotifications = [
      {
        id: 'n-status-unread',
        userId: 'buyer-1',
        type: 'ORDER_STATUS_UPDATED',
        title: 'Order Shipped',
        message: 'Your order ORD-0000001 is now shipped.',
        entityType: 'order',
        entityId: 'o-1',
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-status-read',
        userId: 'buyer-1',
        type: 'ORDER_STATUS_UPDATED',
        title: 'Order Delivered',
        message: 'Your order ORD-0000002 is now delivered.',
        entityType: 'order',
        entityId: 'o-2',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-confirmed-read',
        userId: 'buyer-1',
        type: 'ORDER_CONFIRMED',
        title: 'Order confirmed',
        message: 'The merchant has confirmed your order ORD-0000003.',
        entityType: 'order',
        entityId: 'o-3',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n-seed-order-read',
        userId: 'buyer-1',
        type: 'order',
        title: 'Order Delivered',
        message: 'Your order has been delivered successfully.',
        entityType: 'order',
        entityId: 'o-4',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      meta: { total: 4, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/buyer/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Unread Order Insight notification stays visible…
    expect(await screen.findByText('Order Shipped')).toBeInTheDocument()
    // …read ORDER_STATUS_UPDATED / ORDER_CONFIRMED / seeded `order` ones disappear.
    expect(
      screen.queryByText('Your order ORD-0000002 is now delivered.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('The merchant has confirmed your order ORD-0000003.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Your order has been delivered successfully.'),
    ).not.toBeInTheDocument()
  })
})
