import { ArrowUpDown } from 'lucide-react'
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

interface SortSelectProps {
  sort: SortField
  order: SearchParams['order']
  onChange: (sort: SortField, order: SearchParams['order']) => void
  options?: readonly SortOption[]
}

export function SortSelect({ sort, order, onChange, options = SORT_OPTIONS }: SortSelectProps) {
  const currentValue = `${sort}:${order}`

  const handleChange = (value: string) => {
    const [newSort, newOrder] = value.split(':') as [SortField, SearchParams['order']]
    onChange(newSort, newOrder)
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
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
