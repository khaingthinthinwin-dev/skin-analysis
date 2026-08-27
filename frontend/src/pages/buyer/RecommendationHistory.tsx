import { Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function RecommendationHistory() {
  const history = [
    { date: 'Aug 26, 2026', skinType: 'Combination Skin', hydration: '78%', oilBalance: '62%', topMatch: 'Centella Soothing Cream' },
    { date: 'Jul 14, 2026', skinType: 'Dry & Sensitive', hydration: '54%', oilBalance: '40%', topMatch: 'Barrier Repair Balm' },
    { date: 'Jun 02, 2026', skinType: 'Normal Skin', hydration: '82%', oilBalance: '50%', topMatch: 'Hydrating Essence Toner' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Skin Analysis & Recommendation History</h1>
        <p className="text-sm text-muted-foreground">Log of all past AI scans and profile assessments</p>
      </div>

      <div className="space-y-4">
        {history.map((log, idx) => (
          <Card key={idx} className="border-border/80 shadow-xs">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>{log.date}</span>
                </div>
                <span className="rounded-full bg-purple-100 dark:bg-purple-950 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  {log.skinType}
                </span>
              </div>
            </CardHeader>
            <CardContent className="py-3 pt-0 grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-muted-foreground">Hydration Score:</span>
                <p className="font-extrabold text-foreground">{log.hydration}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Oil Balance:</span>
                <p className="font-extrabold text-foreground">{log.oilBalance}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Top Recommendation:</span>
                <p className="font-extrabold text-purple-600">{log.topMatch}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
