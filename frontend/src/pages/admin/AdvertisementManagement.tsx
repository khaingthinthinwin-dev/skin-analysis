// [PET] Advertisement Management - Admin ad approval queue & fee settings
import React, { useState } from 'react';
import { useAdvertisementApproval } from '@/features/admin/advertisement-management/hooks/useAdvertisementApproval';
import { AdvertisementsTable } from '@/features/admin/advertisement-management/components/AdvertisementsTable';
import { AdFeeSettingsTable } from '@/features/admin/advertisement-management/components/AdFeeSettingsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';

export default function AdvertisementManagement() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const {
    adsQuery,
    feeSettingsQuery,
    approveAdMutation,
    rejectAdMutation,
    updateFeeSettingMutation,
  } = useAdvertisementApproval({ status: statusFilter || undefined });

  const handleApprove = (id: string) => {
    approveAdMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Advertisement approved', variant: 'default' });
      },
      onError: () => {
        toast({ title: 'Failed to approve advertisement', variant: 'destructive' });
      },
    });
  };

  const handleReject = (id: string, reason: string) => {
    rejectAdMutation.mutate({ id, reason }, {
      onSuccess: () => {
        toast({ title: 'Advertisement rejected', variant: 'default' });
      },
      onError: () => {
        toast({ title: 'Failed to reject advertisement', variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advertisement Management</h1>
        <p className="text-muted-foreground">Approve merchant ads and configure placement rates</p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Ad Queue
            <Badge variant="secondary" className="ml-2">
              {adsQuery.data?.total ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="settings">Fee Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
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

          <AdvertisementsTable
            ads={adsQuery.data?.items}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AdFeeSettingsTable
            feeSettings={feeSettingsQuery.data}
            onUpdateRate={(id, dailyRate) =>
              updateFeeSettingMutation.mutate({ id, dailyRate })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
