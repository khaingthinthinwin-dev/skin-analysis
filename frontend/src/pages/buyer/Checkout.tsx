import { CreditCard, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Checkout() {
  return (
    <div className="space-y-6 p-2 lg:p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-purple-600" /> Checkout & Payment
        </h1>
        <p className="text-sm text-muted-foreground">Complete your order details securely</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Full Name" defaultValue="John Doe" />
            <Input placeholder="Street Address" defaultValue="123 Beauty Lane" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City" defaultValue="Yangon" />
              <Input placeholder="Postal Code" defaultValue="11011" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs font-bold text-foreground">Credit / Debit Card</p>
                <p className="text-[10px] text-muted-foreground">Encrypted SSL transaction</p>
              </div>
            </div>
            <Button size="lg" className="w-full font-bold bg-primary">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Place Order ($117.00)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
