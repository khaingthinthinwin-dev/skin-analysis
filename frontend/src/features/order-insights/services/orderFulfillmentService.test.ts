import { describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api-client';
import {
  getMerchantOrderDetail,
  getMerchantOrderTracking,
  updateOrderStatus,
  unwrapData,
} from './orderFulfillmentService';
import type { MerchantOrderDetailDto, MerchantTrackingDto } from '../types/merchantOrderFulfillment.types';
import { OrderStatus } from '../types/orderInsights.types';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const detailPayload: MerchantOrderDetailDto = {
  id: 'order-1',
  orderNumber: 'ORD-ORDER-1',
  createdAt: '2026-09-01T10:00:00.000Z',
  status: OrderStatus.CONFIRMED,
  items: [],
  discountAmount: '0.00',
  totalAmount: '10.00',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  shippingAddress: { recipientName: 'Aye Aye', addressLine1: '1 Main St', country: 'MM' },
  notes: null,
  customer: { name: 'Aye Aye', email: 'aye@example.com', phone: null },
  availableTransitions: ['packed'],
};

const trackingPayload: MerchantTrackingDto = {
  timeline: [
    { status: 'placed', statusName: 'Placed', note: 'Order placed', changedBy: null, createdAt: '2026-09-01T09:00:00.000Z' },
    { status: 'confirmed', statusName: 'Confirmed', note: 'Status updated by merchant', changedBy: 'merchant-1', createdAt: '2026-09-01T10:00:00.000Z' },
  ],
};

describe('orderFulfillmentService', () => {
  it('fetches merchant order detail from /merchant/orders/:id', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: detailPayload } });

    const result = await getMerchantOrderDetail('order-1');

    expect(apiClient.get).toHaveBeenCalledWith('/merchant/orders/order-1');
    expect(result).toEqual(detailPayload);
  });

  it('fetches the tracking timeline from /merchant/orders/:id/tracking', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: trackingPayload } });

    const result = await getMerchantOrderTracking('order-1');

    expect(apiClient.get).toHaveBeenCalledWith('/merchant/orders/order-1/tracking');
    expect(result).toEqual(trackingPayload);
  });

  it('patches /merchant/orders/:id/status with the requested status', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: { ...detailPayload, status: 'packed', availableTransitions: ['shipped'] } } });

    const result = await updateOrderStatus('order-1', 'packed');

    expect(apiClient.patch).toHaveBeenCalledWith('/merchant/orders/order-1/status', { status: 'packed' });
    expect(result.status).toBe('packed');
    expect(result.availableTransitions).toEqual(['shipped']);
  });

  it('unwrapData digs through nested data envelopes and yields passthrough values', () => {
    expect(unwrapData({ data: { data: { data: { ok: true } } } })).toEqual({ ok: true });
    expect(unwrapData({ ok: true })).toEqual({ ok: true });
    expect(unwrapData([])).toEqual([]);
  });

  it('propagates API errors untouched so callers can read the server message', async () => {
    const error = { response: { status: 429, data: { message: 'Too many requests. Please wait 60 seconds' } } };
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(getMerchantOrderDetail('order-1')).rejects.toBe(error);
  });
});