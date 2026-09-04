import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

interface ProfilePromptBannerProps {
  source: 'ai' | 'generic'
  analysisAge?: number // hours since analysis
}

export function ProfilePromptBanner({ source, analysisAge }: ProfilePromptBannerProps) {
  // TODO: Implement 3-state banner with i18n

  // Fresh analysis (≤ 24h) - no banner
  if (source === 'ai' && analysisAge !== undefined && analysisAge <= 24) {
    return null
  }

  // Stale analysis (> 24h) - subtle banner
  if (source === 'ai' && analysisAge !== undefined && analysisAge > 24) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-amber-900">Want Fresh Results?</h3>
          <p className="text-sm text-amber-700">Retake your skin analysis for updated recommendations</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/buyer/skin-analysis">Retake Analysis →</Link>
        </Button>
      </div>
    )
  }

  // No analysis - prominent banner
  return (
    <div className="bg-gradient-to-r from-rose-50 to-purple-50 border border-rose-200 rounded-lg p-6 flex items-center gap-6">
      <div className="flex-1">
        <h3 className="text-lg font-bold text-foreground">Get Personalized Recommendations</h3>
        <p className="text-muted-foreground">Run an AI skin analysis to receive products matched to your skin type and concerns</p>
      </div>
      <Button asChild className="bg-gradient-to-r from-rose-400 to-purple-500">
        <Link to="/buyer/skin-analysis">✦ Start Skin Analysis →</Link>
      </Button>
    </div>
  )
}
