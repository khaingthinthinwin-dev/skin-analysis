import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CategoryNode } from '@/types/search.types'
import { Checkbox } from '@/components/ui/checkbox'

interface CategoryTreeProps {
  categories: CategoryNode[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
}

export function CategoryTree({ categories, selectedCategoryId, onSelect }: CategoryTreeProps) {
  // categories array 
  const safeCategories = Array.isArray(categories) ? categories : []

  return (
    <div className="space-y-1">
      <CategoryItem
        node={{ id: '', name: 'All Categories', slug: '', iconUrl: null, sortOrder: 0, children: [] }}
        selectedCategoryId={selectedCategoryId}
        onSelect={onSelect}
        depth={0}
      />
      {safeCategories.map((category) => (
        <CategoryItem
          key={category.id}
          node={category}
          selectedCategoryId={selectedCategoryId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  )
}

interface CategoryItemProps {
  node: CategoryNode
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
  depth: number
}

function CategoryItem({ node, selectedCategoryId, onSelect, depth }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  // children 
  const children = Array.isArray(node?.children) ? node.children : []
  const hasChildren = children.length > 0
  const isSelected = selectedCategoryId === node.id

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
          isSelected ? 'bg-accent font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
        {!hasChildren && <span className="w-3.5" />}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(node.id)}
          className="shrink-0"
        />
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <CategoryItem
              key={child.id}
              node={child}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}