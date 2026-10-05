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
  MerchantPromotion,
} from '@/types/checkout.types';

export const checkoutService = {
  async getSponsoredAds(): Promise<{ data: SponsoredAd[] }> {
    const { data } = await apiClient.get('/checkout/sponsored-ads');
    const payload = data?.data?.data ?? data?.data ?? data;
    return { data: Array.isArray(payload) ? payload : [] };
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

  async getMerchantPromotions(merchantId: string): Promise<MerchantPromotion[]> {
    const { data } = await apiClient.get(`/checkout/merchant-promotions/${merchantId}`);
    const payload = data?.data?.data ?? data?.data ?? data;
    return Array.isArray(payload) ? payload : [];
  },
};
