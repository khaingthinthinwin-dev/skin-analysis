import { Tag, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Promotions() {
  const promotions = [
    { id: 1, title: 'Summer Glow 20% Off', code: 'SUMMER20', discount: '20% OFF', validUntil: 'Sep 30, 2026', usage: '142 used' },
    { id: 2, title: 'Free Hydrating Mask Bundle', code: 'MASKBUNDLE', discount: 'Free Item', validUntil: 'Oct 15, 2026', usage: '89 used' },
    { id: 3, title: 'New Customer Welcome', code: 'WELCOME10', discount: '$10 OFF', validUntil: 'Dec 31, 2026', usage: '310 used' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-pink-600" /> Merchant Promotions & Coupons
          </h1>
          <p className="text-sm text-muted-foreground">Create discount codes and sales campaigns</p>
        </div>
        <Button size="lg" className="font-bold bg-pink-600 hover:bg-pink-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create Promotion
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {promotions.map((promo) => (
          <Card key={promo.id} className="border-border/80 shadow-xs flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-pink-100 dark:bg-pink-950 px-2.5 py-0.5 text-xs font-bold text-pink-600">
                  {promo.discount}
                </span>
                <span className="text-xs text-muted-foreground">{promo.usage}</span>
              </div>
              <CardTitle className="text-base mt-2">{promo.title}</CardTitle>
              <CardDescription className="font-mono text-xs font-bold text-foreground">
                Code: {promo.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5 border-t border-border/40 pt-3 mt-2">
              <Calendar className="h-3.5 w-3.5" /> Valid until {promo.validUntil}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
