export interface MerchantTrackingItemDto {
  status: string;
  statusName: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface MerchantTrackingResponseDto {
  timeline: MerchantTrackingItemDto[];
}
