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
        unreadOnly: true,
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

  it('navigates the merchant to the Store Profile when an approval notification is clicked', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    const mockNotifications = [
      {
        id: 'n-approved',
        userId: 'merchant-1',
        type: 'MERCHANT_STATUS_CHANGED',
        title: 'Merchant Approved',
        message: 'Your shop "Glow Beauty" has been approved. You can now list products.',
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

    expect(await screen.findByText('Merchant Approved')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Merchant Approved'))

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

  it('opens a product deactivation notification with all statuses available and highlights its product', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-product-deactivated',
          userId: 'merchant-1',
          type: 'PRODUCT_DEACTIVATED',
          title: 'Product Deactivated',
          message: 'Your product "Night Cream" has been deactivated.',
          entityType: 'product',
          entityId: 'prod-2',
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
      return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/merchant/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByText('Product Deactivated'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/merchant/products?highlightProductId=prod-2',
      )
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
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ count: 1 })

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

  it('hides all read notifications for the merchant and keeps only unread ones', async () => {
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

    // Only unread notification stays visible
    expect(await screen.findByText('New order received')).toBeInTheDocument()
    // Read notifications disappear (ORDER_PLACED, ORDER_STATUS_UPDATED, and promo)
    expect(
      screen.queryByText('A buyer placed order ORD-0000002.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Order Shipped')).not.toBeInTheDocument()
    expect(screen.queryByText('Merchant Promo Active')).not.toBeInTheDocument()
  })

  it('links an approved review notification to the reviews on the product view page', async () => {
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
          {location.hash}
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

    const reviewLink = await screen.findByRole('link', {
      name: 'View the review →',
    })
    expect(reviewLink).toHaveAttribute(
      'href',
      '/merchant/products/product-7/view#reviews',
    )

    fireEvent.click(reviewLink)

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/merchant/products/product-7/view#reviews',
      )
      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        'n-merchant-review-approved',
      )
    })
    expect(screen.queryByText('New review received')).not.toBeInTheDocument()
  })

  it('navigates the merchant to the product reviews when the notification body is clicked', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-merchant-review-approved-body',
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
          {location.hash}
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

    expect(await screen.findByText('New review received')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New review received'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/merchant/products/product-7/view#reviews',
      )
    })
  })

  it('navigates the merchant to the highlighted promotion when a redemption notification is clicked', async () => {
    mockRole = 'merchant'
    mockUserId = 'merchant-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-promo-redeemed',
          userId: 'merchant-1',
          type: 'PROMO_REDEEMED',
          title: 'Promotion Redeemed',
          message: 'A buyer used your promotion code "SUMMER20" on order ORD-0001.',
          entityType: 'promotion',
          entityId: 'promo-1',
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

    expect(await screen.findByText('Promotion Redeemed')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Promotion Redeemed'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/merchant/promotions?highlightPromoId=promo-1',
      )
    })
    expect(notificationService.markAsRead).toHaveBeenCalledWith('n-promo-redeemed')
    expect(screen.queryByText('Promotion Redeemed')).not.toBeInTheDocument()
  })

  it('keeps the buyer on the page when a promotion-created notification is clicked', async () => {
    mockRole = 'buyer'
    mockUserId = 'buyer-1'
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: [
        {
          id: 'n-promo-created-buyer',
          userId: 'buyer-1',
          type: 'PROMO_CREATED',
          title: 'New Promotion Available',
          message: 'Use code "SUMMER20" for 20% off. Valid until Dec 31, 2026.',
          entityType: 'promotion',
          entityId: 'promo-1',
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
      return <div data-testid="location">{location.pathname}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/buyer/notifications']}>
          <LocationProbe />
          <Notifications />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('New Promotion Available')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New Promotion Available'))

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        'n-promo-created-buyer',
      )
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/notifications')
    expect(screen.queryByText('New Promotion Available')).not.toBeInTheDocument()
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

  it('hides read buyer notifications', async () => {
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
          isRead: false,
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

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
    expect(screen.queryByText('Previous order')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument()
    expect(notificationService.getNotifications).toHaveBeenCalledWith({
      limit: 50,
      unreadOnly: true,
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
    expect(screen.queryByText('New order')).not.toBeInTheDocument()
    expect(notificationService.getNotifications).toHaveBeenCalledWith({
      limit: 50,
      unreadOnly: true,
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }))

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalledOnce()
      expect(screen.queryByText('Advertisement approved')).not.toBeInTheDocument()
      expect(screen.queryByText('New order')).not.toBeInTheDocument()
    })
  })

  it('hides read admin notifications from the history list', async () => {
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

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
    expect(screen.queryByText('New merchant registration')).not.toBeInTheDocument()
    expect(notificationService.getNotifications).toHaveBeenCalledWith({
      limit: 50,
      unreadOnly: true,
    })
    expect(notificationService.markAsRead).not.toHaveBeenCalled()
  })
})
