import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ADMIN_AD_PLACEMENTS, ADMIN_AD_STATUSES, ADMIN_AD_TIERS } from '@/types/admin-ad-management'
import type { ApprovalStatus, Placement, Tier } from '@/types/admin-ad-management'
import { DateRangePicker, type DateRange } from './DateRangePicker'
import { PLACEMENT_LABELS, TIER_LABELS } from '../utils/labels'

export type AdListFilters = {
  status?: ApprovalStatus
  placement?: Placement
  tier?: Tier
  shop?: string
  dateFrom?: string
  dateTo?: string
}

interface FilterBarProps {
  filters: AdListFilters
  onChange: (patch: Partial<AdListFilters>) => void
  shopPlaceholder?: string
}

export function FilterBar({ filters, onChange, shopPlaceholder = 'Search shop...' }: FilterBarProps) {
  const [shopInput, setShopInput] = useState(filters.shop ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shopInput === (filters.shop ?? '')) return
      onChange({ shop: shopInput.trim() || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [shopInput, filters.shop, onChange])

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(value) => onChange({ status: value === 'all' ? undefined : (value as ApprovalStatus) })}
        >
          <SelectTrigger className="h-9 w-36" aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ADMIN_AD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Placement</span>
        <Select
          value={filters.placement ?? 'all'}
          onValueChange={(value) => onChange({ placement: value === 'all' ? undefined : (value as Placement) })}
        >
          <SelectTrigger className="h-9 w-44" aria-label="Placement filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All placements</SelectItem>
            {ADMIN_AD_PLACEMENTS.map((placement) => (
              <SelectItem key={placement} value={placement}>
                {PLACEMENT_LABELS[placement]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Tier</span>
        <Select
          value={filters.tier ?? 'all'}
          onValueChange={(value) => onChange({ tier: value === 'all' ? undefined : (value as Tier) })}
        >
          <SelectTrigger className="h-9 w-36" aria-label="Tier filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {ADMIN_AD_TIERS.map((tier) => (
              <SelectItem key={tier} value={tier}>
                {TIER_LABELS[tier]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Shop</span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
            placeholder={shopPlaceholder}
            className="h-9 w-52 pl-8"
            aria-label="Search shop name"
          />
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Date range</span>
        <DateRangePicker
          value={{ from: filters.dateFrom, to: filters.dateTo }}
          onChange={(range: DateRange) =>
            onChange({ dateFrom: range.from, dateTo: range.to })
          }
        />
      </div>
    </div>
  )
}