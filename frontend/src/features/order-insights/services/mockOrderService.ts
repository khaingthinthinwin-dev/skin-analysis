import { OrderStatus, OrderListRowDto, OrderListResponseDto } from '../types/orderInsights.types';
import { OrderListFilterFormData } from '../schemas/orderFilters.schema';

const MOCK_ORDERS: OrderListRowDto[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: '2026-08-24T14:30:00Z',
    status: OrderStatus.SHIPPED,
    itemCount: 3,
    totalAmount: '104.50',
    paymentStatus: 'completed',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    createdAt: '2026-08-10T09:15:00Z',
    status: OrderStatus.DELIVERED,
    itemCount: 2,
    totalAmount: '66.00',
    paymentStatus: 'completed',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    createdAt: '2026-07-28T16:45:00Z',
    status: OrderStatus.DELIVERED,
    itemCount: 1,
    totalAmount: '28.00',
    paymentStatus: 'completed',
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-456789012345',
    createdAt: '2026-07-15T11:20:00Z',
    status: OrderStatus.PACKED,
    itemCount: 4,
    totalAmount: '189.99',
    paymentStatus: 'completed',
  },
  {
    id: 'e5f6a7b8-c9d0-1234-efab-567890123456',
    createdAt: '2026-07-01T08:00:00Z',
    status: OrderStatus.CONFIRMED,
    itemCount: 1,
    totalAmount: '45.00',
    paymentStatus: 'pending',
  },
  {
    id: 'f6a7b8c9-d0e1-2345-fabc-678901234567',
    createdAt: '2026-06-20T13:45:00Z',
    status: OrderStatus.OUT_FOR_DELIVERY,
    itemCount: 2,
    totalAmount: '92.75',
    paymentStatus: 'completed',
  },
  {
    id: 'a7b8c9d0-e1f2-3456-abcd-789012345678',
    createdAt: '2026-06-10T10:30:00Z',
    status: OrderStatus.DELIVERED,
    itemCount: 5,
    totalAmount: '215.50',
    paymentStatus: 'completed',
  },
  {
    id: 'b8c9d0e1-f2a3-4567-bcde-890123456789',
    createdAt: '2026-05-28T15:15:00Z',
    status: OrderStatus.SHIPPED,
    itemCount: 1,
    totalAmount: '33.00',
    paymentStatus: 'completed',
  },
];

function applyFilters(orders: OrderListRowDto[], filters: OrderListFilterFormData): OrderListRowDto[] {
  let filtered = [...orders];

  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((o) => o.status === filters.status);
  }

  if (filters.from) {
    const fromDate = new Date(filters.from);
    filtered = filtered.filter((o) => new Date(o.createdAt) >= fromDate);
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((o) => new Date(o.createdAt) <= toDate);
  }

  const sortField = filters.sort || 'createdAt';
  const sortOrder = filters.order || 'desc';

  filtered.sort((a, b) => {
    let aVal: string | number = a[sortField];
    let bVal: string | number = b[sortField];

    if (sortField === 'createdAt') {
      aVal = new Date(aVal as string).getTime();
      bVal = new Date(bVal as string).getTime();
    } else if (sortField === 'totalAmount') {
      aVal = parseFloat(aVal as string);
      bVal = parseFloat(bVal as string);
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return filtered;
}

function paginate<T>(items: T[], page: number, limit: number): { items: T[]; total: number } {
  const start = (page - 1) * limit;
  const end = start + limit;
  return { items: items.slice(start, end), total: items.length };
}

export const mockOrderService = {
  getBuyerOrders: async (filters: OrderListFilterFormData): Promise<OrderListResponseDto> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const filtered = applyFilters(MOCK_ORDERS, filters);
    const { items, total } = paginate(filtered, filters.page, filters.limit);

    return {
      orders: items,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
      },
      summary: {
        totalSpent: filtered.reduce(
          (sum, o) => sum + parseFloat(o.totalAmount),
          0,
        ),
        inProgress: filtered.filter((o) => o.status !== OrderStatus.DELIVERED)
          .length,
        completed: filtered.filter(
          (o) => o.status === OrderStatus.DELIVERED,
        ).length,
      },
    };
  },
};