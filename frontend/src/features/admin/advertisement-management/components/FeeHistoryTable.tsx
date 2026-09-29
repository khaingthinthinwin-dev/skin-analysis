import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPrice } from '@/lib/format'
import type { AdminAdFeeHistory } from '@/types/admin-ad-management'
import { TierBadge } from './badges'
import { PLACEMENT_LABELS, formatDate, isHistoryDeletable } from '../utils/labels'

interface FeeHistoryTableProps {
  rows?: AdminAdFeeHistory[]
  isLoading?: boolean
  selectedIds?: string[]
  onSelectAll?: (checked: boolean) => void
  onSelectRow?: (id: string, checked: boolean) => void
  onDeleteRow?: (row: AdminAdFeeHistory) => void
  isDeleting?: boolean
}

export function FeeHistoryTable({
  rows = [],
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  onDeleteRow,
  isDeleting = false,
}: FeeHistoryTableProps) {
  const deletableRows = rows.filter((row) => isHistoryDeletable(row.createdAt))
  const allDeletableSelected =
    deletableRows.length > 0 &&
    deletableRows.every((row) => selectedIds.includes(row.id))
  if (isLoading) {
    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Date</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Old Rate</TableHead>
              <TableHead className="text-right">New Rate</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }, (_, j) => (
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
            <TableHead className="w-12">
              <Checkbox
                checked={allDeletableSelected}
                onCheckedChange={(checked) => onSelectAll?.(checked)}
                disabled={deletableRows.length === 0}
                title={
                  deletableRows.length === 0
                    ? 'History from the current month cannot be deleted'
                    : 'Select all deletable fee change history'
                }
                aria-label="Select all deletable fee change history"
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">Old Rate</TableHead>
            <TableHead className="text-right">New Rate</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                No fee change history found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const deletable = isHistoryDeletable(row.createdAt)
              const selected = selectedIds.includes(row.id)
              return (
                <TableRow
                  key={row.id}
                  className={
                    selected
                      ? 'bg-secondary/40'
                      : index % 2 === 1
                        ? 'bg-muted/50'
                        : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => onSelectRow?.(row.id, checked)}
                      disabled={!deletable}
                      title={
                        deletable
                          ? undefined
                          : 'History from the current month cannot be deleted'
                      }
                      aria-label={`Select fee change history from ${formatDate(row.createdAt)}`}
                    />
                  </TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell className="font-medium">{PLACEMENT_LABELS[row.placement]}</TableCell>
                  <TableCell>
                    <TierBadge tier={row.tier} />
                  </TableCell>
                  <TableCell className="text-right">
                    {row.oldDailyRate ? formatPrice(Number(row.oldDailyRate)) : '\u2014'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(Number(row.newDailyRate))}
                  </TableCell>
                  <TableCell>{row.changedByName}</TableCell>
                  <TableCell className="max-w-[240px] truncate" title={row.changeReason ?? ''}>
                    {row.changeReason ?? '\u2014'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!deletable || isDeleting || !onDeleteRow}
                      title={
                        deletable
                          ? 'Delete this history record'
                          : 'History from the current month cannot be deleted'
                      }
                      aria-label={`Delete fee change history from ${formatDate(row.createdAt)}`}
                      onClick={() => onDeleteRow?.(row)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}