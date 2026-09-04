import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  productService,
  ProductDetail,
  ReviewListResponse,
  SimilarProduct,
  CreateReviewData,
  ProductReview,
  ActivePromotion,
  SidebarAdvertisement,
  ReportReviewData,
  ReportReviewResult,
} from '../services/product.service';

export function useProductDetail(idOrSlug: string) {
  return useQuery<ProductDetail>({
    queryKey: ['product', idOrSlug],
    queryFn: () => productService.getDetail(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}

interface ReviewsParams {
  page?: number;
  limit?: number;
  sort?: string;
  rating?: number;
}

export function useProductReviews(idOrSlug: string, params: ReviewsParams) {
  return useQuery<ReviewListResponse>({
    queryKey: ['product', idOrSlug, 'reviews', params],
    queryFn: () => productService.getReviews(idOrSlug, params),
    enabled: !!idOrSlug,
    staleTime: 60_000,
  });
}

export function useSimilarProducts(idOrSlug: string, limit = 4) {
  return useQuery<SimilarProduct[]>({
    queryKey: ['product', idOrSlug, 'similar', limit],
    queryFn: () => productService.getSimilar(idOrSlug, limit),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateReview(idOrSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<ProductReview, Error, CreateReviewData>({
    mutationFn: (data) => productService.createReview(idOrSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', idOrSlug, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product', idOrSlug] });
      toast.success('Your review has been submitted and is awaiting approval.');
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Failed to submit your review.');
    },
  });
}

export function useActivePromotions(idOrSlug: string) {
  return useQuery<ActivePromotion[]>({
    queryKey: ['product', idOrSlug, 'promotions'],
    queryFn: () => productService.getPromotions(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSidebarAds(idOrSlug: string) {
  return useQuery<SidebarAdvertisement[]>({
    queryKey: ['product', idOrSlug, 'advertisements'],
    queryFn: () => productService.getSidebarAds(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportReview(reviewId: string) {
  return useMutation<ReportReviewResult, Error, ReportReviewData>({
    mutationFn: (data) => productService.reportReview(reviewId, data),
    onSuccess: () => {
      toast.success('Report submitted');
    },
    onError: (err: Error & { response?: { data?: { message?: string }; status?: number } }) => {
      if (err?.response?.status === 409) {
        toast.info('You have already reported this review');
        return
      }
      if (err?.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
        return
      }
      toast.error(err?.response?.data?.message || 'Failed to submit report.');
    },
  });
}
