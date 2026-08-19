import React from 'react';
import { useAdmin } from '@/features/admin/hooks/useAdmin';
import { AdminStats } from '@/features/admin/components/AdminStats';

export default function Dashboard() {
  const { dashboardQuery } = useAdmin();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide performance & management overview</p>
      </div>

      <AdminStats stats={dashboardQuery.data} />
    </div>
  );
}
