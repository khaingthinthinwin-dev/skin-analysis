import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CategoryNode } from '@/types/search.types'

interface CategorySelectProps {
  categories: CategoryNode[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
}

function flattenCategories(categories: CategoryNode[], depth = 0): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = []
  for (const category of categories) {
    result.push({ id: category.id, name: category.name, depth })
    if (category.children?.length) {
      result.push(...flattenCategories(category.children, depth + 1))
    }
  }
  return result
}

export function CategorySelect({ categories, selectedCategoryId, onSelect }: CategorySelectProps) {
  const safeCategories = Array.isArray(categories) ? categories : []
  const flatCategories = flattenCategories(safeCategories)

  const handleChange = (value: string) => {
    onSelect(value)
  }

  return (
    <Select value={selectedCategoryId} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">
          All Categories
        </SelectItem>
        {flatCategories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {'\u00A0'.repeat(cat.depth * 4)}{cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}