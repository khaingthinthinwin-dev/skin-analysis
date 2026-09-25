import type { Placement, Tier } from '@/types/admin-ad-management'

export const PLACEMENT_LABELS: Record<Placement, string> = {
  search_page_banner: 'Search Page Banner',
  recommendation_page_banner: 'Recommendation Page Banner',
  checkout_page_banner: 'Checkout Page Banner',
  productDetail_page_banner: 'Product Detail Page Banner',
}

export const TIER_LABELS: Record<Tier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '\u2014'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '\u2014'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '\u2014'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '\u2014'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}