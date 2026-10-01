import { useQuery } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'
import type { HistoryQueryParams } from '@/schemas/skin-analysis.schema'

const HISTORY_STALE_MS = 2 * 60 * 1000 // 2 minutes

const DEFAULT_PARAMS: HistoryQueryParams = { page: 1, pageSize: 10 }

export function useAnalysisHistory(params: Partial<HistoryQueryParams> = {}) {
  const resolvedParams: HistoryQueryParams = { ...DEFAULT_PARAMS, ...params }

  return useQuery({
    queryKey: ['skin-analysis', 'history', resolvedParams],
    queryFn: () => skinAnalysisService.getHistory(resolvedParams),
    staleTime: HISTORY_STALE_MS,
    placeholderData: (prev) => prev,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  })
}

// Alias for backward compatibility
export const useAnalysisHistoryQuery = useAnalysisHistory
