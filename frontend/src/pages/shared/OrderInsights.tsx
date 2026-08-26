import { PackageCheck, Truck, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function OrderInsights() {
  const orders = [
    { id: '#SKM-9482', date: 'Aug 24, 2026', items: 3, total: '$104.50', status: 'Shipped' },
    { id: '#SKM-9410', date: 'Aug 10, 2026', items: 2, total: '$66.00', status: 'Delivered' },
    { id: '#SKM-9305', date: 'Jul 28, 2026', items: 1, total: '$28.00', status: 'Delivered' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-purple-600" /> Order History & Insights
        </h1>
        <p className="text-sm text-muted-foreground">Track order status, delivery stages, and past receipts</p>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-purple-50/50 dark:bg-purple-950/20">
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((ord) => (
                <TableRow key={ord.id}>
                  <TableCell className="font-mono text-xs font-bold">{ord.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ord.date}</TableCell>
                  <TableCell className="text-xs font-semibold">{ord.items} items</TableCell>
                  <TableCell className="font-extrabold text-foreground">{ord.total}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ord.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {ord.status === 'Delivered' ? <CheckCircle2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                      {ord.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
