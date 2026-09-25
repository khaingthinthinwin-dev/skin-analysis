import { useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface MerchantProductsGuardResult {
  isApproved: boolean
  isPending: boolean
  isRejected: boolean
  isDeactivated: boolean
  rejectionReason: string | null
  isLoading: boolean
  /** Whether to show CRUD buttons (Add, Edit, Delete, Bulk Actions) */
  showCrudActions: boolean
  /** Whether to show pending approval banner */
  showPendingBanner: boolean
  /** Whether to show rejection banner */
  showRejectionBanner: boolean
  /** Whether to show deactivated banner */
  showDeactivatedBanner: boolean
}

export function useMerchantProductsGuard(): MerchantProductsGuardResult {
  const { user, isLoading, refreshUser } = useAuth()

  useEffect(() => {
    if (!isLoading && user && !user.licenseStatus && !user.license_status) {
      refreshUser()
    }
  }, [isLoading, user, refreshUser])

  return useMemo(() => {
    if (isLoading) {
      return {
        isApproved: false,
        isPending: false,
        isRejected: false,
        isDeactivated: false,
        rejectionReason: null,
        isLoading: true,
        showCrudActions: false,
        showPendingBanner: false,
        showRejectionBanner: false,
        showDeactivatedBanner: false,
      }
    }

    const status =
      user?.licenseStatus ||
      user?.license_status
    const isApproved = status === 'approved'
    const isPending = status === 'pending'
    const isRejected = status === 'rejected'
    const isDeactivated =
      user?.isActive === false ||
      user?.is_active === false ||
      user?.status === 'deactivated' ||
      user?.status === 'inactive'

    return {
      isApproved,
      isPending,
      isRejected,
      isDeactivated,
      rejectionReason: null,
      isLoading: false,
      showCrudActions: isApproved && !isDeactivated,
      showPendingBanner: isPending,
      showRejectionBanner: isRejected,
      showDeactivatedBanner: isDeactivated,
    }
  }, [user, isLoading])
}
