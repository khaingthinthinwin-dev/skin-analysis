import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, Clock, Megaphone, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
  totalUsers?: number;
  totalMerchants?: number;
  pendingMerchants?: number;
  pendingAds?: number;
  pendingReviewReports?: number;
}

interface AdminStatsProps {
  stats?: DashboardStats;
}

const statCards = [
  { key: 'totalUsers', labelKey: 'admin.dashboard.stats.totalUsers', label: 'Total Users', icon: Users },
  { key: 'totalMerchants', labelKey: 'admin.dashboard.stats.totalMerchants', label: 'Total Merchants', icon: Store },
  { key: 'pendingMerchants', labelKey: 'admin.dashboard.stats.pendingMerchants', label: 'Pending Merchants', icon: Clock },
  { key: 'pendingAds', labelKey: 'admin.dashboard.stats.pendingAds', label: 'Pending Ads', icon: Megaphone },
  { key: 'pendingReviewReports', labelKey: 'admin.dashboard.stats.pendingReports', label: 'Pending Reports', icon: Flag },
] as const;

export function AdminStats({ stats }: AdminStatsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map(({ key, labelKey, label, icon: Icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(labelKey, label)}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.[key] ?? 0}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
