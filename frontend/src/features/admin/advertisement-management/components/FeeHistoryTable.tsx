import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPrice } from '../utils/format'
import type { AdminAdFeeHistory } from '@/types/admin-ad-management'
import { TierBadge } from './badges'
import { PLACEMENT_LABELS, formatDate } from '../utils/labels'

interface FeeHistoryTableProps {
  rows?: AdminAdFeeHistory[]
  isLoading?: boolean
}

export function FeeHistoryTable({ rows = [], isLoading = false }: FeeHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Old Rate</TableHead>
              <TableHead className="text-right">New Rate</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }, (_, j) => (
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
            <TableHead>Date</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">Old Rate</TableHead>
            <TableHead className="text-right">New Rate</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                No fee change history found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.createdAt)}</TableCell>
                <TableCell className="font-medium">{PLACEMENT_LABELS[row.placement]}</TableCell>
                <TableCell>
                  <TierBadge tier={row.tier} />
                </TableCell>
                <TableCell className="text-right">
                  {row.oldDailyRate ? formatPrice(Number(row.oldDailyRate)) : '\u2014'}
                </TableCell>
                <TableCell className="text-right">{formatPrice(Number(row.newDailyRate))}</TableCell>
                <TableCell>{row.changedByName}</TableCell>
                <TableCell className="max-w-[240px] truncate" title={row.changeReason ?? ''}>
                  {row.changeReason ?? '\u2014'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}