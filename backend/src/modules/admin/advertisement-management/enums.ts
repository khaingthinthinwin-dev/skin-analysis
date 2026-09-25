export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export enum Placement {
  SEARCH_PAGE_BANNER = 'search_page_banner',
  RECOMMENDATION_PAGE_BANNER = 'recommendation_page_banner',
  CHECKOUT_PAGE_BANNER = 'checkout_page_banner',
  PRODUCTDETAIL_PAGE_BANNER = 'productDetail_page_banner',
}

export enum Tier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum ReportType {
  AD_PERFORMANCE = 'ad_performance',
  SUBMISSION_HISTORY = 'submission_history',
  FEE_HISTORY = 'fee_history',
}

export enum ExportFormat {
  CSV = 'csv',
}
