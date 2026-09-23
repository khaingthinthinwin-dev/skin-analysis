import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPrice } from '@/lib/format'
import type { RevenueAnalytics } from '@/types/admin-ad-management'

function formatCtr(value: number): string {
  return `${(Number(value) * 100).toFixed(2)}%`
}

interface BreakdownTableProps {
  title: string
  description: string
  rows: Array<{
    name: string
    adCount: number
    revenue: number
    avgCtr: number
  }>
}

function BreakdownTable({ title, description, rows }: BreakdownTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placement / Tier</TableHead>
              <TableHead className="text-right">Ad Count</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Avg CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  No data
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">{row.adCount}</TableCell>
                  <TableCell className="text-right">{formatPrice(row.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCtr(row.avgCtr)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface AdsByPlacementTableProps {
  rows: RevenueAnalytics['byPlacement']
}

export function AdsByPlacementTable({ rows }: AdsByPlacementTableProps) {
  return (
    <BreakdownTable
      title="Ads by Placement"
      description="Advertisement breakdown by placement"
      rows={rows.map((row) => ({
        name: row.placementName,
        adCount: row.adCount,
        revenue: row.revenue,
        avgCtr: row.avgCtr,
      }))}
    />
  )
}

interface AdsByTierTableProps {
  rows: RevenueAnalytics['byTier']
}

export function AdsByTierTable({ rows }: AdsByTierTableProps) {
  return (
    <BreakdownTable
      title="Ads by Tier"
      description="Advertisement breakdown by tier"
      rows={rows.map((row) => ({
        name: row.tierName,
        adCount: row.adCount,
        revenue: row.revenue,
        avgCtr: row.avgCtr,
      }))}
    />
  )
}