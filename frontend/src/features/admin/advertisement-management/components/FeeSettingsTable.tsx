import { Pencil, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPrice } from '../utils/format'
import type { AdminAdFeeSetting } from '@/types/admin-ad-management'
import { FeeStatusBadge, TierBadge } from './badges'
import { PLACEMENT_LABELS } from '../utils/labels'

interface FeeSettingsTableProps {
  feeSettings?: AdminAdFeeSetting[]
  onEdit: (feeSetting: AdminAdFeeSetting) => void
  onDeactivate: (feeSetting: AdminAdFeeSetting) => void
  isLoading?: boolean
}

export function FeeSettingsTable({
  feeSettings = [],
  onEdit,
  onDeactivate,
  isLoading = false,
}: FeeSettingsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placement</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Daily Rate</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Total Fee</TableHead>
              <TableHead className="text-right">Max Ads</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }, (_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placement</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">Daily Rate</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead className="text-right">Total Fee</TableHead>
            <TableHead className="text-right">Max Ads</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeSettings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No fee settings found.
              </TableCell>
            </TableRow>
          ) : (
            feeSettings.map((feeSetting) => (
              <TableRow key={feeSetting.id}>
                <TableCell className="font-medium">{PLACEMENT_LABELS[feeSetting.placement]}</TableCell>
                <TableCell>
                  <TierBadge tier={feeSetting.tier} />
                </TableCell>
                <TableCell className="text-right">{formatPrice(Number(feeSetting.dailyRate))}</TableCell>
                <TableCell className="text-right">{feeSetting.durationDays} days</TableCell>
                <TableCell className="text-right">{formatPrice(Number(feeSetting.totalFee))}</TableCell>
                <TableCell className="text-right">{feeSetting.maxAds}</TableCell>
                <TableCell>
                  <FeeStatusBadge active={feeSetting.isActive} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(feeSetting)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={!feeSetting.isActive}
                      onClick={() => onDeactivate(feeSetting)}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Deactivate
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}