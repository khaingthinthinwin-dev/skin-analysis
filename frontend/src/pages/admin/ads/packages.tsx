import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, History, Plus } from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useFeeSettings } from '@/features/admin/advertisement-management/hooks/useFeeSettings'
import { CreateFeeModal } from '@/features/admin/advertisement-management/components/CreateFeeModal'
import { DeactivateFeeModal } from '@/features/admin/advertisement-management/components/DeactivateFeeModal'
import { EditFeeModal } from '@/features/admin/advertisement-management/components/EditFeeModal'
import { FeeSettingsTable } from '@/features/admin/advertisement-management/components/FeeSettingsTable'
import { ReactivateFeeModal } from '@/features/admin/advertisement-management/components/ReactivateFeeModal'
import type { AdminAdFeeSetting } from '@/types/admin-ad-management'
import type { CreateFeeSettingInput, EditFeeSettingInput } from '@/types/admin-ad-management'

function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined
    const message = Array.isArray(data?.message)
      ? data.message[0]
      : data?.message
    if (message) return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

export default function PackageFeeManagementPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminAdFeeSetting | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminAdFeeSetting | null>(null)
  const [reactivateTarget, setReactivateTarget] = useState<AdminAdFeeSetting | null>(null)

  const {
    feeSettingsQuery,
    createMutation,
    updateMutation,
    deactivateMutation,
    reactivateMutation,
  } = useFeeSettings()

  const handleCreate = (input: CreateFeeSettingInput) => {
    createMutation.mutate(input, {
      onSuccess: () => {
        toast({ title: 'Fee setting created', variant: 'default' })
        setCreateOpen(false)
      },
      onError: (error) => {
        toast({
          title: 'Failed to create fee setting',
          description: apiErrorMessage(error),
          variant: 'destructive',
        })
      },
    })
  }

  const handleUpdate = (id: string, data: EditFeeSettingInput) => {
    updateMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast({ title: 'Fee setting updated', variant: 'default' })
          setEditTarget(null)
        },
        onError: (error) => {
          toast({
            title: 'Failed to update fee setting',
            description: apiErrorMessage(error),
            variant: 'destructive',
          })
        },
      },
    )
  }

  const handleDeactivate = (reason: string) => {
    if (!deactivateTarget) return
    deactivateMutation.mutate(
      { id: deactivateTarget.id, change_reason: reason },
      {
        onSuccess: () => {
          toast({ title: 'Fee setting deactivated', variant: 'default' })
          setDeactivateTarget(null)
        },
        onError: (error) => {
          toast({
            title: 'Failed to deactivate fee setting',
            description: apiErrorMessage(error),
            variant: 'destructive',
          })
        },
      },
    )
  }

  const handleReactivate = (reason?: string) => {
    if (!reactivateTarget) return
    reactivateMutation.mutate(
      { id: reactivateTarget.id, change_reason: reason },
      {
        onSuccess: () => {
          toast({ title: 'Fee setting reactivated', variant: 'default' })
          setReactivateTarget(null)
        },
        onError: (error) => {
          toast({
            title: 'Failed to reactivate fee setting',
            description: apiErrorMessage(error),
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Package & Fee Management</h1>
          <p className="text-muted-foreground">Configure advertising fees by placement and tier</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/ads">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Ads
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/ads/fee-history">
              <History className="mr-1 h-4 w-4" />
              View History
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create Fee Setting
          </Button>
        </div>
      </div>

      <FeeSettingsTable
        feeSettings={feeSettingsQuery.data}
        onEdit={setEditTarget}
        onDeactivate={setDeactivateTarget}
        onReactivate={setReactivateTarget}
        isLoading={feeSettingsQuery.isPending}
      />

      {createOpen && (
        <CreateFeeModal
          open
          isLoading={createMutation.isPending}
          existingFeeSettings={feeSettingsQuery.data}
          onSubmit={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editTarget && (
        <EditFeeModal
          open
          feeSetting={editTarget}
          isLoading={updateMutation.isPending}
          onSubmit={handleUpdate}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deactivateTarget && (
        <DeactivateFeeModal
          open
          feeSetting={deactivateTarget}
          isLoading={deactivateMutation.isPending}
          onConfirm={handleDeactivate}
          onClose={() => setDeactivateTarget(null)}
        />
      )}

      {reactivateTarget && (
        <ReactivateFeeModal
          open
          feeSetting={reactivateTarget}
          isLoading={reactivateMutation.isPending}
          onConfirm={handleReactivate}
          onClose={() => setReactivateTarget(null)}
        />
      )}
    </div>
  )
}