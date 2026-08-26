// [PPH] Commission & Revenue - Manage platform fees, payouts, and revenue targets
import { useCommission } from '@/features/admin/hooks/useCommission';
import { CommissionTable } from '@/features/admin/components/CommissionTable';
import { PayoutTable } from '@/features/admin/components/PayoutTable';
import { toast } from '@/components/ui/toast';

export default function CommissionAndRevenue() {
  const { settingsQuery, payoutsQuery, updateSettingsMutation, processPayoutMutation } =
    useCommission();

  const handleUpdateRate = (rate: number) => {
    updateSettingsMutation.mutate(rate, {
      onSuccess: () => {
        toast({ title: 'Commission rate updated', variant: 'default' });
      },
      onError: () => {
        toast({ title: 'Failed to update commission rate', variant: 'destructive' });
      },
    });
  };

  const handleProcessPayout = (payoutId: string) => {
    processPayoutMutation.mutate(payoutId, {
      onSuccess: () => {
        toast({ title: 'Payout processed', variant: 'default' });
      },
      onError: () => {
        toast({ title: 'Failed to process payout', variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commission & Revenue</h1>
        <p className="text-muted-foreground">Manage platform fees and payouts</p>
      </div>

      <CommissionTable
        settings={settingsQuery.data}
        onUpdateRate={handleUpdateRate}
      />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Merchant Payouts</h2>
        <PayoutTable
          payouts={payoutsQuery.data?.items}
          onProcessPayout={handleProcessPayout}
        />
      </div>
    </div>
  );
}
