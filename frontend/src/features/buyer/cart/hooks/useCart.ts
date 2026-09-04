import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { cartService } from '../services/cart.service';

export const cartKeys = {
  all: ['cart'] as const,
  items: (userId?: string) => [...cartKeys.all, userId ?? 'guest', 'items'] as const,
};

export function useCart() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const {
    data: cartData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: cartKeys.items(user?.id),
    queryFn: async () => {
      const result = await cartService.getCart();
      return result;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const addToCartMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity?: number;
    }) => cartService.addToCart(productId, quantity),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({
      cartItemId,
      quantity,
    }: {
      cartItemId: string;
      quantity: number;
    }) => cartService.updateQuantity(cartItemId, quantity),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: (cartItemId: string) => cartService.removeFromCart(cartItemId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });

  const clearAllCartMutation = useMutation({
    mutationFn: () => cartService.clearAllCart(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });

  return {
    items: Array.isArray(cartData?.items) ? cartData.items : [],
    summary: cartData?.summary ?? {
      totalItems: 0,
      subtotal: '0.00',
      shippingEstimate: '0.00',
      total: '0.00',
      hasOutOfStock: false,
      canCheckout: false,
    },
    isLoading,
    isError,
    error,
    refetch,
    addToCart: addToCartMutation.mutateAsync,
    updateQuantity: updateQuantityMutation.mutateAsync,
    removeFromCart: removeFromCartMutation.mutateAsync,
    clearAllCart: clearAllCartMutation.mutateAsync,
    isAdding: addToCartMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isRemoving: removeFromCartMutation.isPending,
    isClearing: clearAllCartMutation.isPending,
  };
}
