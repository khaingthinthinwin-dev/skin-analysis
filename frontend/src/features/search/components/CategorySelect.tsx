import { useState } from 'react'
import type { CategoryNode } from '@/types/search.types'

interface CategorySelectProps {
  categories: CategoryNode[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
}

const COLLAPSED_COUNT = 5

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
  const [expanded, setExpanded] = useState(false)
  const safeCategories = Array.isArray(categories) ? categories : []
  const flatCategories = flattenCategories(safeCategories)

  const allItems = [{ id: '', name: 'All', depth: 0 }, ...flatCategories]
  const visibleItems = expanded ? allItems : allItems.slice(0, COLLAPSED_COUNT)
  const hasMore = allItems.length > COLLAPSED_COUNT

  return (
    <div className="space-y-1">
      {visibleItems.map((item) => {
        const isActive = item.id === selectedCategoryId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`block w-full text-left text-sm transition-colors ${
              isActive
                ? 'text-orange-500 font-semibold'
                : 'text-gray-600 hover:text-orange-500'
            }`}
            style={{ paddingLeft: `${item.depth * 1}rem` }}
          >
            {item.name}
          </button>
        )
      })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-cyan-600 font-bold text-xs uppercase"
        >
          {expanded ? 'View Less' : 'View More'}
        </button>
      )}
    </div>
  )
}
