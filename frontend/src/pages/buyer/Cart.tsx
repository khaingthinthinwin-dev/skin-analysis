import { ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router'

export default function Cart() {
  const items = [
    { id: 1, name: 'Centella Soothing Calming Gel Cream', price: 28.00, qty: 1 },
    { id: 2, name: 'Vitamin C Glowing Serum', price: 42.00, qty: 2 },
  ]

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0)
  const shipping = 5.00
  const total = subtotal + shipping

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-purple-600" /> Shopping Cart
        </h1>
        <p className="text-sm text-muted-foreground">Review items in your cart before checkout</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-border/80 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">${item.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-bold px-2">{item.qty}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-extrabold text-foreground w-16 text-right">
                    ${(item.price * item.qty).toFixed(2)}
                  </span>
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary Card */}
        <Card className="border-border/80 shadow-xs h-fit">
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-bold text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping Estimate</span>
              <span className="font-bold text-foreground">${shipping.toFixed(2)}</span>
            </div>
            <div className="pt-3 border-t border-border flex justify-between text-sm font-extrabold text-foreground">
              <span>Total</span>
              <span className="text-purple-600">${total.toFixed(2)}</span>
            </div>
            <Button asChild size="lg" className="w-full mt-4 font-bold bg-primary">
              <Link to="/buyer/checkout">
                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
