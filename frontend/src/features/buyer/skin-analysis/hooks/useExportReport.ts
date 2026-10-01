import { useMutation } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'

export function useExportReport() {
  return useMutation({
    mutationFn: (analysisId: string) => skinAnalysisService.exportReport(analysisId),
    onSuccess: (blob, analysisId) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `skin-analysis-report-${analysisId.slice(0, 8)}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Failed to export report:', error)
      throw error
    },
  })
}

export function useExportHistoryReport() {
  return useMutation({
    mutationFn: () => skinAnalysisService.exportHistoryReport(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `skin-analysis-full-history-${new Date().toISOString().slice(0, 10)}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Failed to export history report:', error)
      throw error
    },
  })
}