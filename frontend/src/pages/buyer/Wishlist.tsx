import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function Wishlist() {
  const items = [
    { id: 1, name: 'Centella Soothing Calming Gel Cream', price: '$28.00', category: 'Moisturizers' },
    { id: 2, name: 'Vitamin C Glowing Serum', price: '$42.00', category: 'Serums' },
    { id: 3, name: 'Hydrating Foam Cleanser', price: '$24.99', category: 'Cleansers' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500 fill-pink-500" /> My Saved Wishlist
          </h1>
          <p className="text-sm text-muted-foreground">{items.length} items saved for future purchase</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="border-border/80 shadow-xs flex flex-col justify-between">
            <CardContent className="p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase text-purple-600 tracking-wider">{item.category}</span>
              <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="text-base font-extrabold text-foreground">{item.price}</span>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="gap-1 font-bold">
                    <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
