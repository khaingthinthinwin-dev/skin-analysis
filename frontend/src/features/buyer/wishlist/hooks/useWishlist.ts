import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { wishlistService } from '../services/wishlist.service';
import type { WishlistResponse } from '@/types/wishlist-cart.types';

export const wishlistKeys = {
  all: ['wishlist'] as const,
  items: (userId?: string) => [...wishlistKeys.all, userId ?? 'guest', 'items'] as const,
};

type WishlistApiResult = WishlistResponse | { data?: WishlistResponse };

export function useWishlist() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const hasAccessToken = typeof window !== 'undefined' && !!window.localStorage.getItem('accessToken');

  const {
    data: wishlistData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: wishlistKeys.items(user?.id),
    queryFn: async () => {
      console.log('[useWishlist] fetching wishlist for user:', user?.id, {
        isAuthenticated,
        hasAccessToken,
      });
      const result = await wishlistService.getWishlist();
      const response = result as WishlistApiResult;
      const normalizedResult =
        'items' in response
          ? response
          : response.data ?? { items: [], totalCount: 0 };

      console.log('[useWishlist] normalized wishlist result:', normalizedResult);
      return normalizedResult;
    },
    enabled: hasAccessToken || (isAuthenticated && !!user?.id),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistService.addToWishlist(productId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) =>
      wishlistService.removeFromWishlist(productId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });

  const moveToCartMutation = useMutation({
    mutationFn: (productId: string) => wishlistService.moveToCart(productId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearAllWishlistMutation = useMutation({
    mutationFn: () => wishlistService.clearAllWishlist(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });

  return {
    items: wishlistData?.items ?? [],
    totalCount: wishlistData?.totalCount ?? 0,
    isLoading,
    isError,
    error,
    refetch,
    addToWishlist: addToWishlistMutation.mutateAsync,
    removeFromWishlist: removeFromWishlistMutation.mutateAsync,
    moveToCart: moveToCartMutation.mutateAsync,
    clearAllWishlist: clearAllWishlistMutation.mutateAsync,
    isAdding: addToWishlistMutation.isPending,
    isRemoving: removeFromWishlistMutation.isPending,
    isMoving: moveToCartMutation.isPending,
    isClearing: clearAllWishlistMutation.isPending,
  };
}
