import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface Category {
  id: string
  name: string
  slug: string
}

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function CategorySelect({
  value,
  onChange,
  disabled = false,
  className,
}: CategorySelectProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Category[] }>('/categories')
      return response.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoadingSpinner size="sm" />
        Loading categories...
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
        {categories.length === 0 && (
          <SelectItem value="__none" disabled>
            No categories available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
