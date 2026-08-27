import { Link, Navigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  Sparkles,
  Heart,
  ArrowRight,
  ChevronRight,
  Shield,
  Zap,
  Award,
  Gem,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROUTES, getDashboardRoute } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function Home() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return <LoadingSpinner className="min-h-screen" />
  if (isAuthenticated && user) return <Navigate to={getDashboardRoute(user.role)} replace />

  const features = [
    {
      icon: Brain,
      title: 'AI Skin Analysis',
      description:
        'Advanced AI technology analyzes your skin type and concerns to provide personalized recommendations.',
    },
    {
      icon: Sparkles,
      title: 'Smart Matching',
      description:
        'Our intelligent algorithm matches you with the perfect products for your unique skin needs.',
    },
    {
      icon: Heart,
      title: 'Expert Products',
      description:
        'Curated selection of premium skincare products from trusted brands and dermatologists.',
    },
  ]

  const benefits = [
    { icon: Shield, title: 'Dermatologist Approved', description: 'All recommendations are backed by skin experts' },
    { icon: Zap, title: 'Instant Results', description: 'Get your personalized analysis in under 30 seconds' },
    { icon: Award, title: 'Premium Quality', description: 'Only the finest products make it to our recommendations' },
    { icon: Gem, title: 'Personalized Care', description: 'Every recommendation is unique to your skin profile' },
  ]

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-secondary/50" />
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Powered by Advanced AI</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-tight">
                <span className="block">{t('home.hero.title', 'Your Cosmetics Finder Journey')}</span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                {t('home.hero.subtitle', 'Discover personalized skincare products powered by advanced AI analysis')}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild className="group font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link to={ROUTES.REGISTER}>
                    {t('home.hero.cta', 'Get Started')}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="font-semibold">
                  <Link to="/about">
                    Learn More
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Dermatologist Backed</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>AI-Powered Results</span>
                </div>
              </div>
            </div>

            {/* Right Content - Skin Analysis Illustration */}
            <div className="relative hidden lg:flex lg:items-center lg:justify-center">
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-accent/10 rounded-[3rem] blur-[80px] opacity-60" />
                
                <div className="relative">
                  {/* Phone frame */}
                  <div className="relative mx-auto w-64 h-[480px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[3rem] p-3 shadow-2xl">
                    <div className="relative w-full h-full bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent">
                        <div className="flex justify-between items-center px-6 pt-4">
                          <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                          <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                        
                        {/* Face outline */}
                        <div className="relative mx-auto mt-12 w-40 h-48">
                          <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-[40%]" />
                          
                          <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                          <div className="absolute top-2/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
                          <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
                          
                          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                        </div>
                        
                        <div className="absolute bottom-6 left-4 right-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-zinc-700">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Skin Analysis</p>
                              <p className="text-[10px] text-muted-foreground">AI-powered scan</p>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="w-4/5 h-full bg-primary rounded-full" />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">85%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute -right-4 top-1/4 bg-white dark:bg-zinc-800 rounded-xl px-4 py-3 shadow-lg border border-gray-100 dark:border-zinc-700 animate-bounce" style={{ animationDuration: '3s' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Normal Skin</p>
                        <p className="text-[10px] text-muted-foreground">Detected</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute -left-4 bottom-1/3 bg-white dark:bg-zinc-800 rounded-xl px-4 py-3 shadow-lg border border-gray-100 dark:border-zinc-700 animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Hydration</p>
                        <p className="text-[10px] text-muted-foreground">Good level</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Why Choose Us
            </span>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Your Beauty, Our Priority
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powered by cutting-edge artificial intelligence
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="group relative overflow-hidden border-border bg-card shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <CardContent className="p-8">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-card-foreground">{feature.title}</h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
