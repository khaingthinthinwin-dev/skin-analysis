import { useMutation, useQueryClient } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'
import type { AnalysisResultResponse } from '@/schemas/skin-analysis.schema'

export function useRecommendationFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      recommendationId,
      isHelpful,
    }: {
      recommendationId: string
      isHelpful: boolean
    }) => skinAnalysisService.updateRecommendationFeedback(recommendationId, isHelpful),
    onSuccess: (_data, variables) => {
      // Invalidate the analysis detail to refresh isHelpful state
      queryClient.invalidateQueries({
        queryKey: ['skin-analysis', 'detail'],
        predicate: (query) => query.queryKey[2] === variables.recommendationId,
      })
      // Also invalidate any analysis detail queries since recommendations changed
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'detail'] })
    },
  })
}

// Hook for optimistic updates (optional)
export function useOptimisticFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      recommendationId,
      isHelpful,
    }: {
      recommendationId: string
      isHelpful: boolean
    }) => skinAnalysisService.updateRecommendationFeedback(recommendationId, isHelpful),
    onMutate: async ({ recommendationId, isHelpful }) => {
      await queryClient.cancelQueries({ queryKey: ['skin-analysis', 'detail'] })

      const previousDetails = queryClient.getQueryData(['skin-analysis', 'detail'])

      // Optimistically update all analysis details containing this recommendation
      queryClient.setQueriesData<AnalysisResultResponse>(
        { queryKey: ['skin-analysis', 'detail'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            recommendations: old.recommendations.map((rec) =>
              rec.recommendationId === recommendationId
                ? { ...rec, isHelpful }
                : rec,
            ),
          }
        },
      )

      return { previousDetails }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDetails) {
        queryClient.setQueryData(['skin-analysis', 'detail'], context.previousDetails)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'detail'] })
    },
  })
}