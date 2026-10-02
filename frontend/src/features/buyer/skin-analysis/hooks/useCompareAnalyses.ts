import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'

export function useCompareAnalyses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ analysisId1, analysisId2 }: { analysisId1: string; analysisId2: string }) =>
      skinAnalysisService.compareAnalyses(analysisId1, analysisId2),
    onSuccess: (data) => {
      // Cache the comparison result
      queryClient.setQueryData(
        ['skin-analysis', 'compare', data.analysis1.id, data.analysis2.id],
        data,
      )
    },
  })
}

export function useCompareAnalysesQuery(analysisId1: string | null, analysisId2: string | null) {
  return useQuery({
    queryKey: ['skin-analysis', 'compare', analysisId1, analysisId2],
    queryFn: () => skinAnalysisService.compareAnalyses(analysisId1!, analysisId2!),
    enabled: !!analysisId1 && !!analysisId2 && analysisId1 !== analysisId2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}