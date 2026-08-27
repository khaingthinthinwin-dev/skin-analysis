import { Wand2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function MatchingRecommendations() {
  const recommendations = [
    { id: 1, name: 'Centella Soothing Calming Gel Cream', reason: 'Matches your Combination skin & reduces redness', score: '96%', price: '$28.00', rating: 4.9 },
    { id: 2, name: 'Hyaluronic Acid Hydrating Essence', reason: 'Provides deep hydration without clogging pores', score: '94%', price: '$34.00', rating: 4.8 },
    { id: 3, name: 'Gentle Salicylic Acid Cleansing Foam', reason: 'Controls T-Zone oiliness and prevents breakout', score: '91%', price: '$22.50', rating: 4.7 },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">AI Matched Recommendations</h1>
        <p className="text-sm text-muted-foreground">Personalized product list generated based on your skin profile score</p>
      </div>

      {/* Recommendations Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {recommendations.map((item) => (
          <Card key={item.id} className="border-border/80 shadow-xs flex flex-col justify-between">
            <div className="relative h-40 bg-gradient-to-tr from-purple-100/70 to-pink-100/70 flex items-center justify-center p-4">
              <span className="absolute top-3 right-3 rounded-full bg-purple-600 text-white px-2.5 py-0.5 text-xs font-extrabold shadow-xs">
                {item.score} Match
              </span>
              <Wand2 className="h-12 w-12 text-purple-600" />
            </div>
            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground line-clamp-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.reason}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="text-lg font-extrabold text-foreground">{item.price}</span>
                <Button size="sm" className="gap-1.5 font-bold">
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
