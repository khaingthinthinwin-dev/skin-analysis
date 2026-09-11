import apiClient from '@/lib/api-client';
import type {
  CheckoutData,
  CouponValidation,
  CreateOrderPayload,
  OrderConfirmation,
  OrderHistoryResponse,
  OrderDetail,
  OrderTracking,
  SponsoredAd,
} from '@/types/checkout.types';

export const checkoutService = {
  async getSponsoredAds(): Promise<SponsoredAd[]> {
    const { data } = await apiClient.get('/ads', {
      params: { placement: 'checkout_top' },
    });
    const payload = data?.data ?? data;
    return Array.isArray(payload) ? payload.slice(0, 5) : [];
  },

  async trackAdClick(adId: string): Promise<void> {
    await apiClient.post('/ads/track/click', {
      adId,
      placement: 'checkout_top',
    });
  },

  async getCheckoutData(): Promise<CheckoutData> {
    const { data } = await apiClient.get('/checkout');
    const payload = data?.data?.data ?? data?.data ?? data;
    return payload;
  },

  async validateCoupon(
    couponCode: string,
    subtotal: number,
  ): Promise<CouponValidation> {
    const { data } = await apiClient.post('/checkout/validate-coupon', {
      couponCode,
      subtotal,
    });
    const payload = data?.data?.data ?? data?.data ?? data;
    return payload;
  },

  async placeOrder(payload: CreateOrderPayload): Promise<OrderConfirmation> {
    const { data } = await apiClient.post('/orders', payload);
    const result = data?.data?.data ?? data?.data ?? data;
    return result;
  },

  async getOrderHistory(
    page = 1,
    limit = 10,
  ): Promise<OrderHistoryResponse> {
    const { data } = await apiClient.get('/orders', {
      params: { page, limit },
    });
    const payload = data?.data?.data ?? data?.data ?? data;
    return payload;
  },

  async getOrderDetail(orderId: string): Promise<OrderDetail> {
    const { data } = await apiClient.get(`/orders/${orderId}`);
    const payload = data?.data?.data ?? data?.data ?? data;
    return payload;
  },

  async getOrderTracking(orderId: string): Promise<OrderTracking> {
    const { data } = await apiClient.get(`/orders/${orderId}/tracking`);
    const payload = data?.data?.data ?? data?.data ?? data;
    return payload;
  },
};
