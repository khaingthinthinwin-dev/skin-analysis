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
  HOMEPAGE_BANNER = 'homepage_banner',
  PRODUCT_SIDEBAR = 'product_sidebar',
  CATEGORY_BANNER = 'category_banner',
  SEARCH_TOP = 'search_top',
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
