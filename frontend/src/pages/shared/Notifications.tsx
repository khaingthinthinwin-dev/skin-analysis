import { Bell, Sparkles, Tag, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function Notifications() {
  const notifications = [
    { id: 1, title: 'AI Skin Analysis Complete', time: '10 mins ago', desc: 'Your facial skin metrics have been analyzed. View matched recommendations.', icon: Sparkles, color: 'text-pink-500' },
    { id: 2, title: 'Summer Promotion Started', time: '2 hours ago', desc: 'Use code SUMMER20 to get 20% off on all moisturizer products.', icon: Tag, color: 'text-purple-600' },
    { id: 3, title: 'Order Confirmed & Packed', time: '1 day ago', desc: 'Order #SKM-9482 has been packed and is ready for shipment.', icon: CheckCircle2, color: 'text-emerald-500' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6 text-purple-600" /> Notifications Center
        </h1>
        <p className="text-sm text-muted-foreground">Stay updated on skin analysis, orders, and promotions</p>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.id} className="border-border/80 shadow-xs">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-xl bg-muted/60 ${item.color} shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    <span className="text-[11px] text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
