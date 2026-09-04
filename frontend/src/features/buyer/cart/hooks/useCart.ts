import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cartService, AddToCartData, Cart } from '../services/cart.service'

export function useAddToCart() {
  return useMutation<Cart, Error, AddToCartData>({
    mutationFn: (data) => cartService.addItem(data),
    onSuccess: () => {
      toast.success('Added to cart')
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Failed to add to cart.')
    },
  })
}
