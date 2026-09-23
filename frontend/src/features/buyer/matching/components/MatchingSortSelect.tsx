import { ArrowUpDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MatchQueryParams } from '@/schemas/matching.schema'

const MATCH_SORT_OPTIONS: Array<{ value: string; label: string; aiOnly?: boolean }> = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'matchScore:desc', label: 'Match Score', aiOnly: true },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Rating' },
]

interface MatchingSortSelectProps {
  sort: MatchQueryParams['sort']
  order: MatchQueryParams['order']
  source?: 'ai' | 'generic'
  onChange: (sort: MatchQueryParams['sort'], order: MatchQueryParams['order']) => void
}

export function MatchingSortSelect({ sort, order, source = 'generic', onChange }: MatchingSortSelectProps) {
  const currentValue = `${sort ?? 'createdAt'}:${order ?? 'desc'}`
  const options = MATCH_SORT_OPTIONS.filter((opt) => !opt.aiOnly || source === 'ai')

  const handleChange = (value: string) => {
    const [newSort, newOrder] = value.split(':') as [MatchQueryParams['sort'], MatchQueryParams['order']]
    onChange(newSort, newOrder)
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] max-w-full">
        <ArrowUpDown className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
