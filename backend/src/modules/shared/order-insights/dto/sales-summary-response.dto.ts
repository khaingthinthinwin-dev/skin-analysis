export interface SalesSummaryResponseDto {
  todayCount: number;
  thisMonthCount: number;
  completedCount: number;
}

export interface SalesSummaryEnvelopeDto {
  salesSummary: SalesSummaryResponseDto;
}
