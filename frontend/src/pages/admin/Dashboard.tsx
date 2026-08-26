import { Link } from 'react-router'
import { ShieldCheck, Users, UserCheck, Megaphone, DollarSign, ClipboardList, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAdmin } from '@/features/admin/user-management/hooks/useAdmin'
import { AdminStats } from '@/features/admin/components/AdminStats'
import { useAuth } from '@/hooks/useAuth'

export default function AdminDashboard() {
  const { dashboardQuery } = useAdmin()
  const { user } = useAuth()

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 text-white shadow-lg border border-purple-900/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-rose-400" />
            <span>Admin Governance Console</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name || 'Administrator'}!
          </h1>
          <p className="text-sm text-slate-300">
            Platform-wide system metrics, merchant approvals, content moderation, and audit controls.
          </p>
        </div>
        <Button asChild size="lg" className="bg-rose-600 hover:bg-rose-700 text-white font-bold shrink-0 shadow-md">
          <Link to="/admin/merchants">
            <UserCheck className="mr-2 h-4 w-4" /> Review Merchant Approvals
          </Link>
        </Button>
      </div>

      {/* Admin Stats */}
      <AdminStats stats={dashboardQuery.data} />

      {/* Quick Action Navigation Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">User Governance</CardTitle>
                <CardDescription>Accounts & roles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Manage platform buyers, merchants, and admin permissions with role-based access control.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/admin/users">
                Manage Users <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Ad Approvals</CardTitle>
                <CardDescription>Merchant campaigns</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Review and approve merchant advertising banner requests before live display on buyer feeds.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/admin/advertisements">
                Manage Ads <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Commission & Revenue</CardTitle>
                <CardDescription>Financial analytics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Track Marketplace commission rates, order settlements, and overall platform revenue.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/admin/commission-revenue">
                View Revenue <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
