import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { wishlistService, WishlistMutationResult } from '../services/wishlist.service'

export function useAddToWishlist() {
  return useMutation<WishlistMutationResult, Error, string>({
    mutationFn: (productId) => wishlistService.add(productId),
    onSuccess: () => {
      toast.success('Added to wishlist')
    },
    onError: (err: Error & { response?: { data?: { message?: string }; status?: number } }) => {
      if (err?.response?.status === 409) {
        toast.info('Already in wishlist')
        return
      }
      if (err?.response?.status === 401) {
        toast.error('Please sign in to save items')
        return
      }
      toast.error(err?.response?.data?.message || 'Failed to add to wishlist.')
    },
  })
}
