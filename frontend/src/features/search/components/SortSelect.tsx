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

interface SortSelectProps {
  sort: SearchParams['sort']
  order: SearchParams['order']
  onChange: (sort: SearchParams['sort'], order: SearchParams['order']) => void
}

export function SortSelect({ sort, order, onChange }: SortSelectProps) {
  const currentValue = `${sort}:${order}`

  const handleChange = (value: string) => {
    const [newSort, newOrder] = value.split(':') as [SearchParams['sort'], SearchParams['order']]
    onChange(newSort, newOrder)
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <ArrowUpDown className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
