import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ADMIN_AD_PLACEMENTS,
  ADMIN_AD_STATUSES,
  ADMIN_AD_TIERS,
  type AdminExportInput,
} from '@/types/admin-ad-management'
import type { Placement, Tier } from '@/types/admin-ad-management'
import { DateRangePicker } from './DateRangePicker'
import { MultiSelect, type MultiSelectOption } from './MultiSelect'
import { PLACEMENT_LABELS, TIER_LABELS, daysAgoIso, todayIso } from '../utils/labels'

const PLACEMENT_OPTIONS: MultiSelectOption[] = ADMIN_AD_PLACEMENTS.map((placement) => ({
  value: placement,
  label: PLACEMENT_LABELS[placement],
}))
const TIER_OPTIONS: MultiSelectOption[] = ADMIN_AD_TIERS.map((tier) => ({
  value: tier,
  label: TIER_LABELS[tier],
}))
const STATUS_OPTIONS: MultiSelectOption[] = ADMIN_AD_STATUSES.map((status) => ({
  value: status,
  label: status,
}))

interface ExportConfigFormProps {
  isGenerating?: boolean
  onGenerate: (input: Omit<AdminExportInput, 'reportType'>) => void
}

export function ExportConfigForm({ isGenerating = false, onGenerate }: ExportConfigFormProps) {
  const [dateFrom, setDateFrom] = useState(daysAgoIso(29))
  const [dateTo, setDateTo] = useState(todayIso())
  const [placement, setPlacement] = useState<string[]>([])
  const [tier, setTier] = useState<string[]>([])
  const [status, setStatus] = useState<string[]>([])
  const [shop, setShop] = useState('')

  const invalidRange = Boolean(dateFrom && dateTo && dateTo < dateFrom)
  const canGenerate = Boolean(dateFrom && dateTo && !invalidRange)

  return (
    <div className="space-y-4 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Date range</span>
          <DateRangePicker
            value={{ from: dateFrom, to: dateTo }}
            onChange={(range) => {
              setDateFrom(range.from ?? '')
              setDateTo(range.to ?? '')
            }}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Placement</span>
          <MultiSelect label="placements" options={PLACEMENT_OPTIONS} value={placement} onChange={setPlacement} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Tier</span>
          <MultiSelect label="tiers" options={TIER_OPTIONS} value={tier} onChange={setTier} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
          <MultiSelect label="statuses" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Shop</span>
          <Input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="Search shop..."
            className="h-9 w-48"
            aria-label="Search shop name"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Format</span>
          <Select defaultValue="csv">
            <SelectTrigger className="h-9 w-28" disabled aria-label="Export format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {invalidRange && (
        <p role="alert" className="text-sm text-destructive">
          End date must be after start date.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Generates and downloads a CSV report. Filters are optional; leave empty to include all.
        </p>
        <Button
          onClick={() => {
            if (!canGenerate) return
            onGenerate({
              dateFrom,
              dateTo,
              format: 'csv',
              placement: placement as Placement[],
              tier: tier as Tier[],
              status: status as AdminExportInput['status'],
              shop: shop.trim() || undefined,
            })
          }}
          disabled={!canGenerate || isGenerating}
          aria-label="Generate report"
        >
          {isGenerating ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  )
}