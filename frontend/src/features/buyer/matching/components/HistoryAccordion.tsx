import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'
import type { HistorySession } from '@/schemas/matching.schema'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return dateStr
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${date.getFullYear()}/${month}/${day}`
  } catch {
    return dateStr
  }
}

function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  const base = raw.replace(/\/api\/v1\/?$/, '')
  return base + url
}

interface HistoryAccordionProps {
  sessions: HistorySession[]
}

export function HistoryAccordion({ sessions }: HistoryAccordionProps) {
  const { t } = useTranslation('skin')
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.sessionId ?? null)

  if (!sessions || sessions.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('matchingPage.previouslyRecommended')}</h3>
      {sessions.map((session) => {
        const isOpen = openId === session.sessionId
        const products = session.products ?? []
        return (
          <Card key={session.sessionId} className="overflow-hidden border-border/80">
            <button
              onClick={() => setOpenId(isOpen ? null : session.sessionId)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('matchingPage.historyTitle', {
                    date: formatDate(session.sessionDate),
                    skinType: t(`matchingPage.skinTypes.${(session.skinTypesUsed ?? [])[0]?.toLowerCase()}`, {
                      defaultValue: (session.skinTypesUsed ?? [])[0] || t('matchingPage.unknown'),
                    }),
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('matchingPage.productsRecommended', { count: products.length })}
                </p>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </button>
            {isOpen && products.length > 0 && (
              <div className="px-4 pb-4 border-t">
                <div className="flex flex-wrap gap-3 mt-3">
                  {products.map((rec) => (
                    <Link
                      key={rec.id}
                      to={`/buyer/products/${rec.slug}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors w-[280px]"
                    >
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {rec.images && rec.images[0] ? (
                          <img
                            src={getImageUrl(rec.images[0])}
                            alt={rec.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <span className="text-xl">🧴</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{rec.name}</p>
                        {rec.matchScore !== null && (
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('matchingPage.matchPercent', { percent: rec.matchScore })}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{Number(rec.price).toLocaleString()}Ks</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
