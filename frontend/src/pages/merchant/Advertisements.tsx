import { Megaphone, Plus, Eye, MousePointerClick, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Advertisements() {
  const ads = [
    { id: 1, title: 'Hero Banner: Vitamin C Serum', status: 'Active', impressions: '24,500', clicks: '1,820', ctr: '7.4%' },
    { id: 2, title: 'Category Featured: Gentle Foaming Cleanser', status: 'Approved', impressions: '12,100', clicks: '940', ctr: '7.7%' },
    { id: 3, title: 'Search Banner: Deep Moisture Barrier Cream', status: 'Pending Approval', impressions: '0', clicks: '0', ctr: '0%' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-amber-600" /> Sponsored Ads & Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">Request featured banner placement on buyer feeds</p>
        </div>
        <Button size="lg" className="font-bold bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create Ad Request
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {ads.map((ad) => (
          <Card key={ad.id} className="border-border/80 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    ad.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : ad.status === 'Approved'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {ad.status}
                </span>
              </div>
              <CardTitle className="text-base mt-2">{ad.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Impressions</span>
                <span className="font-bold text-foreground">{ad.impressions}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" /> Clicks</span>
                <span className="font-bold text-foreground">{ad.clicks}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground pt-2 border-t border-border/40">
                <span>Click-Through Rate (CTR)</span>
                <span className="font-extrabold text-amber-600">{ad.ctr}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
