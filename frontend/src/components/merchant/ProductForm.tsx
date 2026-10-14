import { useNavigate } from 'react-router'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploadZone } from './ImageUploadZone'
import { ImagePreviewGrid } from './ImagePreviewGrid'
import { TagInput } from './TagInput'
import { CategorySelect } from './CategorySelect'
import { RichTextEditor } from './RichTextEditor'
import { useProductForm, type ProductFormData } from '@/hooks/useProductForm'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import type { Product } from '@/types/product.types'

interface ProductFormProps {
  product?: Product
  mode: 'create' | 'edit'
}

const SKIN_TYPES = [
  { value: 'dry', key: 'dry' },
  { value: 'oily', key: 'oily' },
  { value: 'combination', key: 'combination' },
  { value: 'sensitive', key: 'sensitive' },
  { value: 'normal', key: 'normal' },
]

export function ProductForm({ product, mode }: ProductFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const form = useProductForm({ mode, product })
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form

  const onSubmit = async (data: ProductFormData) => {
    try {
      const submittedData = {
        ...data,
        skinTypes: (data.skinTypes || []).flatMap((s: string) => {
          const lower = s.toLowerCase()
          return lower === 'all'
            ? ['dry', 'oily', 'combination', 'sensitive', 'normal']
            : lower
        }),
        isFeatured: data.isFeatured === true,
      }
      if (mode === 'create') {
        await createProduct.mutateAsync(submittedData)
        toast.success(t('merchant.products.toast.created'))
      } else if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          data: submittedData,
        })
        toast.success(t('merchant.products.toast.updated'))
      }
      navigate('/merchant/products')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
      const backendMessage = axiosErr?.response?.data?.message
      const message = backendMessage
        ? Array.isArray(backendMessage)
          ? backendMessage.join(', ')
          : backendMessage
        : axiosErr?.message || t('merchant.products.error.generic')
      toast.error(message)
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('isActive')} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/merchant/products')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">
            {mode === 'create' ? t('merchant.products.form.createTitle') : t('merchant.products.form.editTitle', { name: product?.name })}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {mode === 'create' ? t('merchant.products.form.create') : t('merchant.products.form.saveChanges')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('merchant.products.form.basicInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('merchant.products.form.productName')} *</Label>
                <Input id="name" {...register('name')} placeholder={t('merchant.products.form.productNamePlaceholder')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">{t('merchant.products.form.shortDescription')} *</Label>
                <Textarea
                  id="shortDescription"
                  {...register('shortDescription')}
                  placeholder={t('merchant.products.form.shortDescriptionPlaceholder')}
                  rows={2}
                />
                {errors.shortDescription && (
                  <p className="text-sm text-destructive">{errors.shortDescription.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('merchant.products.form.fullDescription')} *</Label>
                <RichTextEditor
                  value={watch('description') || ''}
                  onChange={(val) => setValue('description', val)}
                  placeholder={t('merchant.products.form.fullDescriptionPlaceholder')}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('merchant.products.form.media')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === 'edit' && product && (
                <ImagePreviewGrid
                  images={product.images}
                  retainedUrls={watch('retainedImageUrls') || []}
                  onRetainedUrlsChange={(urls) => setValue('retainedImageUrls', urls)}
                />
              )}
              <ImageUploadZone
                files={watch('images') || []}
                onFilesChange={(files) => setValue('images', files)}
                maxFiles={10}
              />
              {errors.images && (
                <p className="text-sm text-destructive">{errors.images.message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('merchant.products.form.tagsAttributes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('merchant.products.form.tags')}</Label>
                <TagInput
                  tags={watch('tags') || []}
                  onTagsChange={(tags) => setValue('tags', tags)}
                  placeholder={t('merchant.products.form.addTagPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('merchant.products.form.skinTypes')}</Label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TYPES.map((st) => {
                    const selected = (watch('skinTypes') || []).some(
                      (s: string) => s.toLowerCase() === st.value,
                    )
                    return (
                      <Button
                        key={st.value}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const current = watch('skinTypes') || []
                          const normalized = current.map((s: string) => s.toLowerCase())
                          if (selected) {
                            setValue(
                              'skinTypes',
                              normalized.filter((s: string) => s !== st.value),
                            )
                          } else {
                            setValue('skinTypes', [...normalized, st.value])
                          }
                        }}
                      >
                        {t(`merchant.products.form.skinType.${st.key}`)}
                      </Button>
                    )
                  })}
                </div>
                {errors.skinTypes && (
                  <p className="text-sm text-destructive">{errors.skinTypes.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('merchant.products.form.ingredients')}</Label>
                <TagInput
                  tags={watch('ingredients') || []}
                  onTagsChange={(tags) => setValue('ingredients', tags)}
                  placeholder={t('merchant.products.form.addIngredientPlaceholder')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('merchant.products.form.organization')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('merchant.products.form.category')} *</Label>
                <CategorySelect
                  value={watch('categoryId') || ''}
                  onChange={(val) => setValue('categoryId', val)}
                />
                {errors.categoryId && (
                  <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register('sku')} placeholder={t('merchant.products.form.skuPlaceholder')} disabled className="disabled:opacity-50 disabled:cursor-not-allowed" />
                {errors.sku && (
                  <p className="text-sm text-destructive">{errors.sku.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('merchant.products.form.pricingInventory')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {t('merchant.products.form.price')} ({t('merchant.products.form.discountPrice')}){' '}
                  <span className="font-normal text-muted-foreground">({t('merchant.products.form.optional')})</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('merchant.products.form.salePricePlaceholder')}
                  {...register('price', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">{t('merchant.products.form.compareAtPrice')} *</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('merchant.products.form.compareAtPricePlaceholder')}
                  {...register('compareAtPrice', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
                {errors.compareAtPrice && (
                  <p className="text-sm text-destructive">{errors.compareAtPrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockQuantity">{t('merchant.products.form.stockQuantity')} *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  {...register('stockQuantity', { valueAsNumber: true })}
                />
                {errors.stockQuantity && (
                  <p className="text-sm text-destructive">{errors.stockQuantity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">{t('merchant.products.form.lowStockThreshold')}</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  {...register('lowStockThreshold', { valueAsNumber: true })}
                />
                {errors.lowStockThreshold && (
                  <p className="text-sm text-destructive">{errors.lowStockThreshold.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
