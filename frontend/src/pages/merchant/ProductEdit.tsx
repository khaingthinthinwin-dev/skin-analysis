import { useParams, useNavigate } from 'react-router'
import { useEffect } from 'react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductForm } from '@/components/merchant/ProductForm'
import { useProduct } from '@/hooks/useProducts'

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading, error } = useProduct(id || '')

  useEffect(() => {
    if (!isLoading && error) {
      navigate('/merchant/products')
    }
  }, [isLoading, error, navigate])

  if (isLoading) {
    return <LoadingSpinner className="min-h-[400px]" />
  }

  if (!product) return null

  return (
    <div className="p-2 lg:p-4">
      <ProductForm product={product} mode="edit" />
    </div>
  )
}
