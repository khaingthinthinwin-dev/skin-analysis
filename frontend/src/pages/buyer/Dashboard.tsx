import { Link } from 'react-router'
import { Sparkles, Wand2, Heart, ShoppingCart, Search, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export default function BuyerDashboard() {
  const { user } = useAuth()

  const stats = [
    { label: 'AI Skin Analysis', value: 'Analyzed', change: 'Combination Skin', icon: Sparkles, color: 'text-pink-500' },
    { label: 'AI Matches', value: '12 Items', change: 'Personalized for you', icon: Wand2, color: 'text-purple-600' },
    { label: 'Wishlist Items', value: '8 Saved', change: 'Saved products', icon: Heart, color: 'text-rose-500' },
    { label: 'Shopping Cart', value: '3 Items', change: 'Ready for checkout', icon: ShoppingCart, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-600 p-6 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-pink-300" />
            <span>Buyer Beauty Hub</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Beauty Enthusiast'}!
          </h1>
          <p className="text-sm text-purple-100/80">
            Check your AI skin profile results, matched recommendations, and saved skincare routines.
          </p>
        </div>
        <Button asChild size="lg" className="bg-pink-500 hover:bg-pink-600 text-white font-bold shrink-0 shadow-md">
          <Link to="/buyer/skin-analysis">
            <Sparkles className="mr-2 h-4 w-4" /> Start AI Skin Scan
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

      {/* Feature Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Skin Scan</CardTitle>
                <CardDescription>Instant facial skin diagnosis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Upload or take a photo to analyze your skin type, hydration levels, and specific skincare concerns.
            </p>
            <Button asChild className="w-full bg-primary justify-between">
              <Link to="/buyer/skin-analysis">
                Perform Scan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                <Wand2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Product Recommendations</CardTitle>
                <CardDescription>Personalized match scores</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              View skincare products tailored specifically to your skin profile with high confidence match ratings.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/buyer/recommendations">
                View Recommendations <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Cosmetics Catalog</CardTitle>
                <CardDescription>Search & filter products</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Search top brands, filter by skincare concerns, ingredient lists, price ranges, and verified reviews.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/buyer/search">
                Search Catalog <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dermatologist Trust Banner */}
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground">Dermatologist Approved AI Engine</h4>
          <p className="text-xs text-muted-foreground">
            All skin analysis algorithms and recommendations are modeled after clinical skincare guidelines.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link to="/shared/profile">
            <UserCheck className="mr-1 h-4 w-4" /> Skin Profile Settings
          </Link>
        </Button>
      </div>
    </div>
  )
}
