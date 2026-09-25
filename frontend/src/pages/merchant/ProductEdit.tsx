import { useParams, useNavigate } from 'react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductForm } from '@/components/merchant/ProductForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProduct } from '@/hooks/useProducts'
import { useAuth } from '@/hooks/useAuth'

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: product, isLoading, error, refetch } = useProduct(id || '')

  const status =
    user?.licenseStatus ||
    user?.license_status
  const isDeactivated =
    user?.isActive === false ||
    user?.is_active === false ||
    user?.status === 'deactivated' ||
    user?.status === 'inactive'

  useEffect(() => {
    if (isDeactivated) {
      toast.error(
        'Your merchant account is currently Deactivate. Some features may be restricted until an admin activates your account.',
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (status === 'pending') {
      toast.error(
        'Your merchant account is pending approval. This operation is restricted until your license is approved.',
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (status === 'rejected') {
      toast.error(
        'Your merchant account has been rejected. Please contact support.',
      )
      navigate('/merchant/products', { replace: true })
    }
  }, [status, isDeactivated, navigate])

  if (isDeactivated || status === 'pending' || status === 'rejected') {
    return null
  }

  if (isLoading) {
    return <LoadingSpinner className="min-h-[400px]" />
  }

  if (error) {
    return (
      <div className="p-2 lg:p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Failed to Load Product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Unable to load the product details. Please try again.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => refetch()}>Retry</Button>
              <Button variant="outline" onClick={() => navigate('/merchant/products')}>
                Back to Products
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!product) return null

  return (
    <div className="p-2 lg:p-4">
      <ProductForm product={product} mode="edit" />
    </div>
  )
}
