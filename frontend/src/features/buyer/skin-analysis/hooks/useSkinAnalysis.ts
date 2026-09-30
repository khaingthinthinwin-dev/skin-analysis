import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'
import type {
  UploadImageResponse,
  StartAnalysisResponse,
  AnalysisResultResponse,
} from '@/schemas/skin-analysis.schema'

const UPLOAD_STALE_MS = 5_000
const ANALYSIS_STALE_MS = 30_000

// ─── Upload Image ────────────────────────────────────────────────────────

export function useUploadImage() {
  const queryClient = useQueryClient()

  return useMutation<UploadImageResponse, Error, { file: File; consent: boolean }>({
    mutationFn: ({ file, consent }: { file: File; consent: boolean }) =>
      skinAnalysisService.uploadImage(file, consent),
    onSuccess: (data) => {
      // Invalidate latest analysis to refresh quota
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'latest'] })
      // Store the blobUrl for the next step
      queryClient.setQueryData(['skin-analysis', 'pending-upload'], data)
    },
    onError: () => {
      queryClient.removeQueries({ queryKey: ['skin-analysis', 'pending-upload'] })
    },
  })
}

// ─── Start Analysis ──────────────────────────────────────────────────────

export function useStartAnalysis() {
  const queryClient = useQueryClient()

  return useMutation<StartAnalysisResponse, Error, string>({
    mutationFn: (blobUrl: string) => skinAnalysisService.startAnalysis(blobUrl),
    onSuccess: (data) => {
      // Invalidate latest analysis to refresh quota
      queryClient.invalidateQueries({ queryKey: ['skin-analysis', 'latest'] })
      // Store the analysisId for polling
      queryClient.setQueryData(['skin-analysis', 'active-analysis-id'], data.analysisId)
      // Prefetch the full analysis result
      queryClient.prefetchQuery({
        queryKey: ['skin-analysis', 'detail', data.analysisId],
        queryFn: () => skinAnalysisService.getAnalysisById(data.analysisId),
        staleTime: ANALYSIS_STALE_MS,
      })
    },
  })
}

// ─── Get Latest Analysis ─────────────────────────────────────────────────

export function useLatestAnalysis() {
  return useQuery({
    queryKey: ['skin-analysis', 'latest'],
    queryFn: () => skinAnalysisService.getLatest(),
    staleTime: UPLOAD_STALE_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

// ─── Get Analysis Detail (for results view) ──────────────────────────────

export function useAnalysisDetail(analysisId: string | null) {
  return useQuery({
    queryKey: ['skin-analysis', 'detail', analysisId],
    queryFn: () => skinAnalysisService.getAnalysisById(analysisId!),
    enabled: !!analysisId,
    staleTime: ANALYSIS_STALE_MS,
    placeholderData: (prev) => prev,
  })
}

// ─── Poll for Analysis Completion ────────────────────────────────────────

export function usePollAnalysis(
  analysisId: string | null,
  options?: {
    interval?: number
    maxAttempts?: number
    onComplete?: (data: AnalysisResultResponse) => void
    onError?: (error: Error) => void
  },
) {
  const { interval = 2_000, maxAttempts = 30, onComplete, onError } = options ?? {}

  const query = useQuery({
    queryKey: ['skin-analysis', 'poll', analysisId],
    queryFn: () => skinAnalysisService.getAnalysisById(analysisId!),
    enabled: !!analysisId,
    refetchInterval: (q) => {
      const status = q.state.data?.status
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') return false
      return interval
    },
    refetchIntervalInBackground: false,
    retry: maxAttempts,
    retryDelay: interval,
    placeholderData: (prev) => prev,
  })

  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onComplete, onError])

  const terminalStatus =
    query.data?.status === 'COMPLETED' ||
    query.data?.status === 'FAILED' ||
    query.data?.status === 'CANCELLED'

  useEffect(() => {
    if (!terminalStatus || !query.data) return
    if (handledRef.current === query.data.analysisId) return
    handledRef.current = query.data.analysisId

    if (query.data.status === 'COMPLETED') {
      onCompleteRef.current?.(query.data)
    } else if (query.error) {
      onErrorRef.current?.(query.error as Error)
    }
  }, [terminalStatus, query.data, query.error])

  return query
}

// ─── Combined Hook for Active Scan Flow ──────────────────────────────────

export function useSkinAnalysis() {
  const uploadMutation = useUploadImage()
  const startMutation = useStartAnalysis()
  const latestQuery = useLatestAnalysis()
  const queryClient = useQueryClient()

  const uploadImage = uploadMutation.mutateAsync
  const startAnalysis = startMutation.mutateAsync
  const isUploading = uploadMutation.isPending
  const isAnalyzing = startMutation.isPending
  const error = uploadMutation.error ?? startMutation.error
  const remainingQuota = latestQuery.data?.remainingDailyQuota ?? 0

  const reset = () => {
    uploadMutation.reset()
    startMutation.reset()
    queryClient.removeQueries({ queryKey: ['skin-analysis', 'pending-upload'] })
    queryClient.removeQueries({ queryKey: ['skin-analysis', 'active-analysis-id'] })
  }

  return {
    uploadImage,
    startAnalysis,
    isUploading,
    isAnalyzing,
    activeAnalysis: null, // Deprecated — use useAnalysisDetail with analysisId
    error,
    remainingQuota,
    latestAnalysis: latestQuery.data,
    reset,
  }
}

// ─── Helper to get pending upload data ──────────────────────────────────

export function usePendingUpload() {
  return useQuery({
    queryKey: ['skin-analysis', 'pending-upload'],
    queryFn: () => Promise.reject('No pending upload'),
    enabled: false,
    staleTime: Infinity,
  })
}

// ─── Helper to get active analysis ID ────────────────────────────────────

export function useActiveAnalysisId() {
  return useQuery({
    queryKey: ['skin-analysis', 'active-analysis-id'],
    queryFn: () => Promise.reject('No active analysis'),
    enabled: false,
    staleTime: Infinity,
  })
}