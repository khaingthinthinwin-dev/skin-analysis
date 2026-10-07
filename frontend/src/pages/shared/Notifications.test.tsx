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
    sessionStorage.clear()
    localStorage.setItem('accessToken', 'mock-admin-token')
    vi.mocked(notificationService.markAsRead).mockResolvedValue(undefined)
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
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue({
      updated: 2,
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
    const markAllReadButton = await screen.findByRole('button', { name: 'Mark all read' })
    expect(markAllReadButton).toBeInTheDocument()
    expect(await screen.findByText('New merchant registration')).toBeInTheDocument()
    expect(screen.getAllByText('New merchant registration')).toHaveLength(1)
    expect(await screen.findByText('New advertisement submitted')).toBeInTheDocument()
    expect(await screen.findByText('Merchant license resubmitted')).toBeInTheDocument()
    expect(screen.queryByText('Order Placed')).not.toBeInTheDocument()
    expect(screen.queryByText('Summer Promotion Active')).not.toBeInTheDocument()
    expect((await screen.findAllByText('View in Merchant Management →')).length).toBeGreaterThan(0)

    fireEvent.click(markAllReadButton)
    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalledOnce()
      expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument()
    })
    expect(screen.queryByText('New merchant registration')).not.toBeInTheDocument()
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

  it('marks an opened admin notification as read and removes it from the list', async () => {
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
      expect(screen.queryByText('New advertisement submitted')).not.toBeInTheDocument()
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

  it('links an approved review notification to the buyer product reviews tab', async () => {
    mockRole = 'buyer'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-review-approved',
          userId: 'buyer-1',
          type: 'REVIEW_APPROVED',
          title: 'Your review was approved',
          message: 'Your review for "Serum" has been approved and is now live.',
          entityType: 'Product',
          entityId: 'product-7',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })

    function LocationProbe() {
      const location = useLocation()
      return (
        <div data-testid="location">
          {location.pathname}
          {location.hash}
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/buyer/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const reviewLink = await screen.findByRole('link', { name: 'View your review →' })
    expect(reviewLink).toHaveAttribute(
      'href',
      '/buyer/products/product-7#reviews',
    )

    fireEvent.click(reviewLink)

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/buyer/products/product-7#reviews',
      )
    })
  })

  it('links an approved review notification to the merchant Product Review page', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-merchant-review-approved',
          userId: 'merchant-1',
          type: 'REVIEW_APPROVED',
          title: 'New review received',
          message: 'A new review has been approved for "Honey Lip Balm".',
          entityType: 'Product',
          entityId: 'product-7',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })

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
        <MemoryRouter initialEntries={['/merchant/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const productReviewLink = await screen.findByRole('link', {
      name: 'View in Product Review →',
    })
    expect(productReviewLink).toHaveAttribute(
      'href',
      '/merchant/product-review?highlight=product-7',
    )

    fireEvent.click(productReviewLink)

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/merchant/product-review?highlight=product-7',
      )
      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        'n-merchant-review-approved',
      )
    })
    expect(screen.queryByText('New review received')).not.toBeInTheDocument()
  })

  it('marks a buyer notification as read and removes it from the list', async () => {
    mockRole = 'buyer'
    mockUserId = 'buyer-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-buyer-order',
          userId: 'buyer-1',
          type: 'ORDER_PLACED',
          title: 'Order placed',
          message: 'Your order was placed.',
          entityType: 'order',
          entityId: 'order-1',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/buyer/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByText('Order placed'))

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('n-buyer-order')
      expect(screen.queryByText('Order placed')).not.toBeInTheDocument()
    })
  })

  it('clears all buyer notifications when Mark all read is clicked', async () => {
    mockRole = 'buyer'
    mockUserId = 'buyer-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-buyer-read',
          userId: 'buyer-1',
          type: 'ORDER_PLACED',
          title: 'Previous order',
          message: 'Your order was placed.',
          entityType: 'order',
          entityId: 'order-1',
          isRead: true,
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 0 })
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ updated: 0 })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/buyer/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Previous order')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }))

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalledOnce()
      expect(screen.queryByText('Previous order')).not.toBeInTheDocument()
    })
  })

  it('clears all merchant notifications after marking them read', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-unread',
          userId: 'merchant-1',
          type: 'AD_APPROVED',
          title: 'Advertisement approved',
          message: 'Your advertisement is approved.',
          entityType: 'advertisement',
          entityId: 'ad-1',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'n-read',
          userId: 'merchant-1',
          type: 'ORDER_PLACED',
          title: 'New order',
          message: 'A new order was placed.',
          entityType: 'order',
          entityId: 'order-1',
          isRead: true,
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
    })
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ updated: 1 })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/merchant/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Advertisement approved')).toBeInTheDocument()
    expect(await screen.findByText('New order')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }))

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalledOnce()
      expect(screen.queryByText('Advertisement approved')).not.toBeInTheDocument()
      expect(screen.queryByText('New order')).not.toBeInTheDocument()
    })
  })

  it('removes an opened read notification from the history list', async () => {
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

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('New merchant registration')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New merchant registration'))

    // Already-read items are dismissed without another read API call.
    expect(notificationService.markAsRead).not.toHaveBeenCalled()
    expect(screen.queryByText('New merchant registration')).not.toBeInTheDocument()
  })
})
