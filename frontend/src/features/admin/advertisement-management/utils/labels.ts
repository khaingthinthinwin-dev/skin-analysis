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

// ---------------------------------------------------------------------------
// Fee change history: month filter + deletion protection
// ---------------------------------------------------------------------------

export interface MonthOption {
  value: string
  label: string
}

/**
 * Fee change history created in the current calendar month is protected and can
 * never be deleted — only records from previous months can be removed. Months are
 * compared in UTC because `ad_fee_history.created_at` is stored in UTC and the API
 * enforces the same calendar-month rule.
 */
export function isHistoryDeletable(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const now = new Date()
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  return created.getTime() < currentMonthStart
}

/**
 * Formats a `YYYY-MM` month filter value, e.g. `2026-09` → `September 2026`.
 */
export function formatMonthLabel(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  if (!year || !month) return monthIso
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * Builds the month filter options, starting with the current month.
 */
export function recentMonthOptions(count = 12, now: Date = new Date()): MonthOption[] {
  const options: MonthOption[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    options.push({ value, label: formatMonthLabel(value) })
  }
  return options
}