import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { ProductForm } from '@/components/merchant/ProductForm'

export default function ProductCreate() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

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
        t('merchant.account.deactivated'),
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (status === 'pending') {
      toast.error(
        t('merchant.account.pendingOperation'),
      )
      navigate('/merchant/products', { replace: true })
      return
    }
    if (status === 'rejected') {
      toast.error(
        t('merchant.account.rejectedContactSupport'),
      )
      navigate('/merchant/products', { replace: true })
    }
  }, [status, isDeactivated, navigate, t])

  if (isDeactivated || status === 'pending' || status === 'rejected') {
    return null
  }

  return (
    <div className="p-2 lg:p-4">
      <ProductForm mode="create" />
    </div>
  )
}
