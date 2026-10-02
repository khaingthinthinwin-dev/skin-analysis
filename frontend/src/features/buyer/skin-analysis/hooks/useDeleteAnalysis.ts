import { useMutation, useQueryClient } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'

/**
 * Mutation hook to delete a single skin analysis.
 * Invalidates history and latest caches on success.
 */
export function useDeleteAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (analysisId: string) => skinAnalysisService.deleteAnalysis(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'latest'] })
    },
  })
}

/**
 * Mutation hook to bulk-delete multiple skin analyses.
 * Invalidates history and latest caches on success.
 */
export function useDeleteAnalyses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => skinAnalysisService.deleteAnalyses(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'latest'] })
    },
  })
}
