import { Outlet } from 'react-router';
import { DashboardLayout } from './DashboardLayout';

export function MerchantLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
