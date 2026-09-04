import apiClient from '@/lib/api-client';
import type { WishlistResponse, MoveToCartResponse } from '@/types/wishlist-cart.types';

export const wishlistService = {
  async getWishlist(): Promise<WishlistResponse> {
    try {
      const { data } = await apiClient.get('/wishlist');
      console.log('[wishlist.service] getWishlist response:', data);
      return data.data;
    } catch (error) {
      console.error('[wishlist.service] getWishlist error:', error);
      throw error;
    }
  },

  async addToWishlist(productId: string) {
    try {
      const { data } = await apiClient.post(`/wishlist/${productId}`);
      console.log('[wishlist.service] addToWishlist response:', data);
      return data.data;
    } catch (error) {
      console.error('[wishlist.service] addToWishlist error:', error);
      throw error;
    }
  },

  async removeFromWishlist(productId: string) {
    try {
      const response = await apiClient.delete(`/wishlist/${productId}`);
      console.log('[wishlist.service] removeFromWishlist response:', response.status, response.data);
      return response;
    } catch (error) {
      console.error('[wishlist.service] removeFromWishlist error:', error);
      throw error;
    }
  },

  async moveToCart(productId: string): Promise<MoveToCartResponse> {
    try {
      const { data } = await apiClient.post(
        `/wishlist/${productId}/move-to-cart`,
      );
      console.log('[wishlist.service] moveToCart response:', data);
      return data.data;
    } catch (error) {
      console.error('[wishlist.service] moveToCart error:', error);
      throw error;
    }
  },

  async clearAllWishlist() {
    try {
      const { data } = await apiClient.delete('/wishlist');
      console.log('[wishlist.service] clearAllWishlist response:', data);
      return data.data;
    } catch (error) {
      console.error('[wishlist.service] clearAllWishlist error:', error);
      throw error;
    }
  },
};
