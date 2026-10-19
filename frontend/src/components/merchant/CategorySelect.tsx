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
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
        {t('merchant.products.loadingCategories')}
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={t('merchant.products.selectCategory')} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
        {categories.length === 0 && (
          <SelectItem value="__none" disabled>
            {t('merchant.products.noCategories')}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
