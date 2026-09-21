import { useMutation } from '@tanstack/react-query'
import {
  advertisementService,
  downloadCsv,
  type AdPerformanceExportParams,
  type FeeHistoryExportParams,
  type SubmissionHistoryExportParams,
} from '../services/advertisement.service'

export function useExport() {
  const exportAdPerformanceMutation = useMutation({
    mutationFn: (input: AdPerformanceExportParams) =>
      advertisementService.exportAdPerformance(input),
    onSuccess: downloadCsv,
  })

  const exportSubmissionHistoryMutation = useMutation({
    mutationFn: (input: SubmissionHistoryExportParams) =>
      advertisementService.exportSubmissionHistory(input),
    onSuccess: downloadCsv,
  })

  const exportFeeHistoryMutation = useMutation({
    mutationFn: (input: FeeHistoryExportParams) => advertisementService.exportFeeHistory(input),
    onSuccess: downloadCsv,
  })

  return {
    exportAdPerformanceMutation,
    exportSubmissionHistoryMutation,
    exportFeeHistoryMutation,
  }
}