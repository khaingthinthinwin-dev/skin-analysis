import { Link } from 'react-router'
import { Package, Tag, Megaphone, TrendingUp, Plus, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export default function MerchantDashboard() {
  const { user } = useAuth()

  const stats = [
    { label: 'Total Products', value: '24', change: '4 new this week', icon: Package, color: 'text-purple-600' },
    { label: 'Active Promotions', value: '5', change: '2 ending soon', icon: Tag, color: 'text-pink-600' },
    { label: 'Running Ads', value: '2', change: 'Active campaigns', icon: Megaphone, color: 'text-amber-600' },
    { label: 'Order Insights', value: '142', change: '+18% vs last month', icon: TrendingUp, color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-700 p-6 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <span>Merchant Portal</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name || 'Merchant'}!
          </h1>
          <p className="text-sm text-purple-100/80">
            Manage your skincare product catalog, active promotions, and advertising campaigns.
          </p>
        </div>
        <Button asChild size="lg" className="bg-white text-purple-900 hover:bg-purple-50 font-bold shrink-0 shadow-md">
          <Link to="/merchant/products">
            <Plus className="mr-2 h-4 w-4" /> Add New Product
          </Link>
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border/80 shadow-xs transition-transform hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.label}</CardTitle>
                <div className={`p-2 rounded-xl bg-muted/60 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Product Catalog</CardTitle>
                <CardDescription>Add, update, or remove products</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Keep your store listings up-to-date with ingredients, prices, and high-resolution images.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/merchant/products">
                Manage Products <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Promotions</CardTitle>
                <CardDescription>Discount codes & sales offers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Create seasonal sales and bundle discounts to boost customer attraction and store engagement.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/merchant/promotions">
                Manage Promotions <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Advertisements</CardTitle>
                <CardDescription>Featured sponsored listings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Submit ad requests to feature your products on the top buyer search and recommendation banners.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/merchant/advertisements">
                Manage Ads <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
