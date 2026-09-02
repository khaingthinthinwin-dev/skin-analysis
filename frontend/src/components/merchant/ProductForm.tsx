import { useNavigate } from 'react-router'
import { Save, ArrowLeft, Loader2, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  { value: 'dry', label: 'Dry' },
  { value: 'oily', label: 'Oily' },
  { value: 'combination', label: 'Combination' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'normal', label: 'Normal' },
]

export function ProductForm({ product, mode }: ProductFormProps) {
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
      if (mode === 'create') {
        await createProduct.mutateAsync(data)
        toast.success('Product created successfully')
      } else if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          data,
        })
        toast.success('Product updated successfully')
      }
      navigate('/merchant/products')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
      const backendMessage = axiosErr?.response?.data?.message
      const message = backendMessage
        ? String(backendMessage)
        : axiosErr?.message || 'Something went wrong. Please try again.'
      toast.error(message)
    }
  }

  const onSaveAsDraft = async () => {
    try {
      const data = form.getValues()
      const draftData = { ...data, isActive: false }
      if (mode === 'create') {
        await createProduct.mutateAsync(draftData)
        toast.success('Product saved as draft')
      } else if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          data: draftData,
        })
        toast.success('Product saved as draft')
      }
      navigate('/merchant/products')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
      const backendMessage = axiosErr?.response?.data?.message
      const message = backendMessage
        ? String(backendMessage)
        : axiosErr?.message || 'Something went wrong. Please try again.'
      toast.error(message)
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            {mode === 'create' ? 'Create New Product' : `Edit: ${product?.name}`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveAsDraft}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Save as Draft
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {mode === 'create' ? 'Create Product' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" {...register('name')} placeholder="e.g., Vitamin C Serum" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea
                  id="shortDescription"
                  {...register('shortDescription')}
                  placeholder="Brief product description (max 500 chars)"
                  rows={2}
                />
                {errors.shortDescription && (
                  <p className="text-sm text-destructive">{errors.shortDescription.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description *</Label>
                <RichTextEditor
                  value={watch('description') || ''}
                  onChange={(val) => setValue('description', val)}
                  placeholder="Detailed product description"
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Media</CardTitle>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tags & Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  tags={watch('tags') || []}
                  onTagsChange={(tags) => setValue('tags', tags)}
                  placeholder="Add a tag..."
                />
              </div>

              <div className="space-y-2">
                <Label>Skin Types</Label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TYPES.map((st) => {
                    const selected = (watch('skinTypes') || []).includes(st.value)
                    return (
                      <Button
                        key={st.value}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const current = watch('skinTypes') || []
                          if (selected) {
                            setValue(
                              'skinTypes',
                              current.filter((s: string) => s !== st.value),
                            )
                          } else {
                            setValue('skinTypes', [...current, st.value])
                          }
                        }}
                      >
                        {st.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ingredients</Label>
                <TagInput
                  tags={watch('ingredients') || []}
                  onTagsChange={(tags) => setValue('ingredients', tags)}
                  placeholder="Add an ingredient..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category *</Label>
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
                <Input id="sku" {...register('sku')} placeholder="e.g., VCS-001" />
                {errors.sku && (
                  <p className="text-sm text-destructive">{errors.sku.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) =>
                    setValue('isActive', checked, { shouldDirty: true, shouldValidate: true })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch
                  id="isFeatured"
                  checked={watch('isFeatured')}
                  onCheckedChange={(checked) => setValue('isFeatured', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare at Price</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('compareAtPrice', { valueAsNumber: true })}
                />
                {errors.compareAtPrice && (
                  <p className="text-sm text-destructive">{errors.compareAtPrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
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
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
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
