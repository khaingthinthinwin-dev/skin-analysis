import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HistorySession } from '@/schemas/matching.schema'

interface RecommendationHistoryProps {
  sessions: HistorySession[]
  isLoading?: boolean
}

export function RecommendationHistory({ sessions, isLoading }: RecommendationHistoryProps) {
  // TODO: Implement accordion history with i18n
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-12" />
        ))}
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recommendation history yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Card key={session.analysisId} className="overflow-hidden">
          <button
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50"
            onClick={() => setExpandedId(expandedId === session.analysisId ? null : session.analysisId)}
          >
            <div className="text-left">
              <p className="font-medium">{session.skinType} analysis</p>
              <p className="text-sm text-muted-foreground">
                {new Date(session.completedAt).toLocaleDateString()}
              </p>
            </div>
            {expandedId === session.analysisId ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandedId === session.analysisId && (
            <div className="border-t p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {session.recommendations.map((rec) => (
                <div key={rec.productId} className="text-center">
                  <img
                    src={rec.imageUrl}
                    alt={rec.name}
                    className="w-full aspect-square object-cover rounded"
                  />
                  <p className="text-xs mt-1 line-clamp-1">{rec.name}</p>
                  <p className="text-xs font-bold">{rec.matchScore}%</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
