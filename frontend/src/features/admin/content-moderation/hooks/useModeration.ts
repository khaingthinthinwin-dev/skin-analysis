import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationService } from '../services/moderation.service';

export function useModeration(params?: { page?: number; limit?: number; is_approved?: boolean }) {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews', params],
    queryFn: () => moderationService.getReviews(params),
  });

  const reviewReportsQuery = useQuery({
    queryKey: ['admin', 'review-reports'],
    queryFn: () => moderationService.getReviewReports(),
  });

  const flaggedContentQuery = useQuery({
    queryKey: ['admin', 'products', 'flagged'],
    queryFn: () => moderationService.getFlaggedContent(),
  });

  const approveReviewMutation = useMutation({
    mutationFn: (id: string) => moderationService.approveReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => moderationService.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'resolved' | 'rejected'; note?: string }) =>
      moderationService.resolveReport(id, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'review-reports'] });
    },
  });

  const deactivateProductMutation = useMutation({
    mutationFn: (productId: string) => moderationService.deactivateProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'flagged'] });
    },
  });

  return {
    reviewsQuery,
    reviewReportsQuery,
    flaggedContentQuery,
    approveReviewMutation,
    deleteReviewMutation,
    resolveReportMutation,
    deactivateProductMutation,
  };
}
