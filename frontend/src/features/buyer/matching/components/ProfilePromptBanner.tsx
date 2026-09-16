import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sparkles } from 'lucide-react'

interface ProfilePromptBannerProps {
  source: 'ai' | 'generic'
  analysisAge?: number | null // hours since analysis
}

export function ProfilePromptBanner({ source, analysisAge }: ProfilePromptBannerProps) {
  const age = analysisAge ?? 0

  // Fresh analysis (≤ 24h) - no banner
  if (source === 'ai' && age <= 24) {
    return null
  }

  // Stale analysis (> 24h) - subtle banner
  if (source === 'ai' && age > 24) {
    return (
      <div className="rounded-xl p-4 flex items-center justify-between bg-amber-50 border border-amber-200">
        <div className="flex items-center gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm font-semibold text-amber-700">Want Fresh Results?</p>
            <p className="text-xs text-amber-600">Retake your skin analysis for updated recommendations</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100" asChild>
          <Link to="/buyer/skin-analysis">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Retake Analysis
          </Link>
        </Button>
      </div>
    )
  }

  // No analysis - prominent banner
  return (
    <div className="rounded-xl p-6 flex items-center gap-6 bg-gradient-to-r from-pink-50 to-purple-50 border border-purple-100">
      <div className="text-5xl flex-shrink-0">🧑‍🔬</div>
      <div className="flex-1">
        <h2 className="text-lg font-bold text-foreground">Get Personalized Recommendations</h2>
        <p className="text-sm text-muted-foreground mt-1">Run an AI skin analysis to receive products matched to your skin type and concerns</p>
      </div>
      <Button className="flex-shrink-0 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold px-6" asChild>
        <Link to="/buyer/skin-analysis">
          <Sparkles className="h-4 w-4 mr-2" /> Start Skin Analysis
        </Link>
      </Button>
    </div>
  )
}
