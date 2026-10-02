import apiClient from '@/lib/api-client'
import type * as SkinAnalysisSchema from '@/schemas/skin-analysis.schema'

export const skinAnalysisService = {
  /**
   * Upload a facial scan image to local storage.
   * Returns the storage URL and image metadata.
   */
  async uploadImage(file: File, consent: boolean): Promise<SkinAnalysisSchema.UploadImageResponse> {
    const formData = new FormData()
    formData.append('facialImage', file)
    formData.append('consent', String(consent))

    const response = await apiClient.post<{ data: SkinAnalysisSchema.UploadImageResponse }>(
      '/skin-analysis/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return response.data.data
  },

  /**
   * Start an AI skin analysis for the uploaded image.
   * Returns analysisId, status, quota info, and estimated wait time.
   */
  async startAnalysis(blobUrl: string): Promise<SkinAnalysisSchema.StartAnalysisResponse> {
    const response = await apiClient.post<{ data: SkinAnalysisSchema.StartAnalysisResponse }>(
      '/skin-analysis/analyze',
      { blobUrl },
    )
    return response.data.data
  },

  /**
   * Get the latest completed analysis summary for the dashboard.
   */
  async getLatest(): Promise<SkinAnalysisSchema.LatestAnalysisResponse | null> {
    const response = await apiClient.get<{ data: SkinAnalysisSchema.LatestAnalysisResponse | null }>(
      '/skin-analysis/latest',
    )
    return response.data.data
  },

  /**
    * Get full analysis result by ID (conditions, findings, recommendations).
   */
  async getAnalysisById(analysisId: string): Promise<SkinAnalysisSchema.AnalysisResultResponse> {
    const response = await apiClient.get<{ data: SkinAnalysisSchema.AnalysisResultResponse }>(
      `/skin-analysis/${analysisId}`,
    )
    return response.data.data
  },

  /**
   * Get paginated analysis history with summary KPIs.
   */
  async getHistory(params: {
    page?: number
    pageSize?: number
    dateFrom?: string
    dateTo?: string
  }): Promise<SkinAnalysisSchema.HistoryResponse> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value))
    })
    const response = await apiClient.get<{ data: SkinAnalysisSchema.HistoryResponse }>(
      `/skin-analysis/history?${searchParams.toString()}`,
    )
    return response.data.data
  },

  /**
   * Get health score and hydration trends for charting.
   */
  async getTrends(range: '30d' | '90d' | '1y' | 'all' = 'all'): Promise<SkinAnalysisSchema.TrendsResponse> {
    const response = await apiClient.get<{ data: SkinAnalysisSchema.TrendsResponse }>(
      `/skin-analysis/trends?range=${range}`,
    )
    return response.data.data
  },

  /**
   * Compare two completed analyses.
   */
  async compareAnalyses(
    analysisId1: string,
    analysisId2: string,
  ): Promise<SkinAnalysisSchema.ComparisonResult> {
    const response = await apiClient.post<{ data: SkinAnalysisSchema.ComparisonResult }>(
      '/skin-analysis/compare',
      { analysisId1, analysisId2 },
    )
    return response.data.data
  },

  /**
   * Export a single analysis report as PDF.
   * Returns a blob for download.
   */
  async exportReport(analysisId: string): Promise<Blob> {
    const response = await apiClient.get(`/skin-analysis/${analysisId}/export`, {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Export full longitudinal history as PDF.
   * Returns a blob for download.
   */
  async exportHistoryReport(): Promise<Blob> {
    const response = await apiClient.get('/skin-analysis/export-history', {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Submit helpfulness feedback for a product recommendation.
   */
  async updateRecommendationFeedback(
    recommendationId: string,
    isHelpful: boolean,
  ): Promise<SkinAnalysisSchema.FeedbackResponse> {
    const response = await apiClient.post<{ data: SkinAnalysisSchema.FeedbackResponse }>(
      `/skin-analysis/recommendations/${recommendationId}/feedback`,
      { isHelpful },
    )
    return response.data.data
  },

  /**
   * Delete a single analysis by ID.
   */
  async deleteAnalysis(analysisId: string): Promise<{ deletedCount: number }> {
    const response = await apiClient.delete<{ data: { deletedCount: number } }>(
      `/skin-analysis/${analysisId}`,
    )
    return response.data.data
  },

  /**
   * Bulk-delete multiple analyses by IDs.
   */
  async deleteAnalyses(ids: string[]): Promise<{ deletedCount: number }> {
    const response = await apiClient.delete<{ data: { deletedCount: number } }>(
      '/skin-analysis/bulk',
      { data: { ids } },
    )
    return response.data.data
  },
}