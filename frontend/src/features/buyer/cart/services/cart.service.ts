import apiClient from '@/lib/api-client';
import type { CartItem, CartResponse } from '@/types/wishlist-cart.types';

export const cartService = {
  async getCart(): Promise<CartResponse> {
    const { data } = await apiClient.get('/cart');
    const payload = data?.data?.data ?? data?.data ?? data;

    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      summary: payload?.summary ?? {
        totalItems: 0,
        subtotal: '0.00',
        shippingEstimate: '0.00',
        total: '0.00',
        hasOutOfStock: false,
        canCheckout: false,
      },
    };
  },

  async addToCart(productId: string, quantity = 1): Promise<CartItem> {
    const { data } = await apiClient.post('/cart/items', {
      productId,
      quantity,
    });
    return data.data;
  },

  async updateQuantity(
    cartItemId: string,
    quantity: number,
  ): Promise<CartItem> {
    const { data } = await apiClient.patch(`/cart/items/${cartItemId}`, {
      quantity,
    });
    return data.data;
  },

  async removeFromCart(cartItemId: string) {
    await apiClient.delete(`/cart/items/${cartItemId}`);
  },

  async clearAllCart() {
    const { data } = await apiClient.delete('/cart/items');
    return data.data;
  },
};
