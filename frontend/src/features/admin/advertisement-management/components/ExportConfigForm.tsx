import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.export.dateRange', 'Date range')}</span>
          <DateRangePicker
            value={{ from: dateFrom, to: dateTo }}
            onChange={(range) => {
              setDateFrom(range.from ?? '')
              setDateTo(range.to ?? '')
            }}
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.export.placement', 'Placement')}</span>
          <MultiSelect
            label={t('admin.ads.export.placementsLabel', 'placements')}
            options={PLACEMENT_OPTIONS.map((option) => ({
              ...option,
              label: t(`admin.ads.placement.${option.value}`, option.label),
            }))}
            value={placement}
            onChange={setPlacement}
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.export.tier', 'Tier')}</span>
          <MultiSelect
            label={t('admin.ads.export.tiersLabel', 'tiers')}
            options={TIER_OPTIONS.map((option) => ({
              ...option,
              label: t(`admin.ads.tier.${option.value}`, option.label),
            }))}
            value={tier}
            onChange={setTier}
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.export.status', 'Status')}</span>
          <MultiSelect
            label={t('admin.ads.export.statusesLabel', 'statuses')}
            options={STATUS_OPTIONS.map((option) => ({
              ...option,
              label: t(`admin.ads.status.${option.value}`, option.label),
            }))}
            value={status}
            onChange={setStatus}
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.export.shop', 'Shop')}</span>
          <Input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder={t('admin.ads.export.searchShopPlaceholder', 'Search shop...')}
            className="h-9 w-full sm:w-48"
            aria-label={t('admin.ads.export.searchShopNameLabel', 'Search shop name')}
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.ads.export.format', 'Format')}</span>
          <Select defaultValue="csv">
            <SelectTrigger className="h-9 w-full sm:w-28" disabled aria-label={t('admin.ads.export.exportFormatLabel', 'Export format')}>
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
          {t('admin.ads.export.invalidRange', 'End date must be after start date.')}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t('admin.ads.export.helperText', 'Generates and downloads a CSV report. Filters are optional; leave empty to include all.')}
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
          aria-label={t('admin.ads.export.generateReportLabel', 'Generate report')}
        >
          {isGenerating ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              {t('admin.ads.export.generating', 'Generating...')}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t('admin.ads.export.generateReport', 'Generate Report')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}