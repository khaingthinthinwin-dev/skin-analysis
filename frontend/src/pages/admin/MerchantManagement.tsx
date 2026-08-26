// [PET] Merchant Management - Review business licenses and manage seller applications
import React, { useState } from 'react';
import { useMerchantApproval } from '@/features/admin/merchant-management/hooks/useMerchantApproval';
import { MerchantsTable } from '@/features/admin/merchant-management/components/MerchantsTable';
import { LicenseReviewModal } from '@/features/admin/content-moderation/components/LicenseReviewModal';
import { Merchant } from '@/features/admin/merchant-management/services/merchant.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';

export default function MerchantManagement() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { merchantsQuery, approveMutation, rejectMutation } = useMerchantApproval({
    status: statusFilter || undefined,
  });
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'Merchant approved', variant: 'default' });
        setSelectedMerchant(null);
      },
      onError: () => {
        toast({ title: 'Failed to approve merchant', variant: 'destructive' });
      },
    });
  };

  const handleReject = (id: string, reason: string) => {
    rejectMutation.mutate({ id, reason }, {
      onSuccess: () => {
        toast({ title: 'Merchant rejected', variant: 'default' });
        setSelectedMerchant(null);
      },
      onError: () => {
        toast({ title: 'Failed to reject merchant', variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Merchant Management</h1>
        <p className="text-muted-foreground">Review business licenses and manage seller applications</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex gap-2">
              {['', 'pending', 'approved', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Total merchants:</span>
        <Badge variant="secondary">{merchantsQuery.data?.total ?? 0}</Badge>
      </div>

      <MerchantsTable
        merchants={merchantsQuery.data?.items}
        onSelectReview={(m: any) => setSelectedMerchant(m)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <LicenseReviewModal
        merchant={selectedMerchant}
        isOpen={!!selectedMerchant}
        onClose={() => setSelectedMerchant(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
