import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HistorySession } from '@/schemas/matching.schema'

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

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
        <Card key={session.sessionId} className="overflow-hidden">
          <button
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50"
            onClick={() => setExpandedId(expandedId === session.sessionId ? null : session.sessionId)}
          >
            <div className="text-left">
              <p className="font-medium">
                {session.skinTypesUsed.length > 0
                  ? `${session.skinTypesUsed.join(', ')} analysis`
                  : 'Analysis'}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(session.sessionDate).toLocaleDateString()}
              </p>
            </div>
            {expandedId === session.sessionId ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandedId === session.sessionId && (
            <div className="border-t p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {session.products.map((rec) => (
                <div key={rec.id} className="text-center">
                  <img
                    src={getImageUrl(rec.images[0])}
                    alt={rec.name}
                    className="w-full aspect-square object-cover rounded"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <p className="text-xs mt-1 line-clamp-1">{rec.name}</p>
                  {rec.matchScore !== null && (
                    <p className="text-xs font-bold">{rec.matchScore}%</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
