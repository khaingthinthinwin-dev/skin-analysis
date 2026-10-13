import { ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SORT_OPTIONS } from '@/schemas/search.schema'
import type { SearchParams } from '@/schemas/search.schema'

type SortField = SearchParams['sort'] | 'matchScore'

interface SortOption {
  value: string
  label: string
}

const SORT_LABEL_KEYS: Record<string, string> = {
  'createdAt:desc': 'buyer.search.sortOptions.newest',
  'price:asc': 'buyer.search.sortOptions.priceLowToHigh',
  'price:desc': 'buyer.search.sortOptions.priceHighToLow',
  'rating:desc': 'buyer.search.sortOptions.highestRated',
}

interface SortSelectProps {
  sort: SortField
  order: SearchParams['order']
  onChange: (sort: SortField, order: SearchParams['order']) => void
  options?: readonly SortOption[]
}

export function SortSelect({ sort, order, onChange, options = SORT_OPTIONS }: SortSelectProps) {
  const { t } = useTranslation()
  const currentValue = `${sort}:${order}`

  const handleChange = (value: string) => {
    const [newSort, newOrder] = value.split(':') as [SortField, SearchParams['order']]
    onChange(newSort, newOrder)
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] border-border bg-card text-foreground">
        <ArrowUpDown className="mr-2 h-4 w-4" />
        <SelectValue placeholder={t('buyer.search.sortBy', 'Sort by')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {SORT_LABEL_KEYS[opt.value] ? t(SORT_LABEL_KEYS[opt.value], opt.label) : opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
