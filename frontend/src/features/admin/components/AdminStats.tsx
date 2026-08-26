import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, Clock, Megaphone, Flag } from 'lucide-react';

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
  { key: 'totalUsers', label: 'Total Users', icon: Users },
  { key: 'totalMerchants', label: 'Total Merchants', icon: Store },
  { key: 'pendingMerchants', label: 'Pending Merchants', icon: Clock },
  { key: 'pendingAds', label: 'Pending Ads', icon: Megaphone },
  { key: 'pendingReviewReports', label: 'Pending Reports', icon: Flag },
] as const;

export function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
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
