import { Link } from 'react-router'
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
import { ROUTES } from '@/lib/constants'

export default function Home() {
  const { t } = useTranslation()

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
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Powered by Advanced AI</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
                <span className="block">{t('home.hero.title')}</span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                {t('home.hero.subtitle')}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild className="group">
                  <Link to={ROUTES.REGISTER}>
                    {t('home.hero.cta')}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/about">
                    Learn More
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Dermatologist Backed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>AI-Powered Results</span>
                </div>
              </div>
            </div>

            {/* Right Content - Skin Analysis Illustration */}
            <div className="relative hidden lg:flex lg:items-center lg:justify-center">
              <div className="relative w-full max-w-md mx-auto">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-accent/10 rounded-[3rem] blur-[80px] opacity-60" />
                
                {/* Main illustration container */}
                <div className="relative">
                  {/* Phone frame */}
                  <div className="relative mx-auto w-64 h-[480px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[3rem] p-3 shadow-2xl">
                    {/* Phone screen */}
                    <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                      {/* Screen content - Face scan */}
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent">
                        {/* Status bar */}
                        <div className="flex justify-between items-center px-6 pt-4">
                          <div className="w-16 h-1 bg-gray-200 rounded-full" />
                          <div className="w-20 h-1 bg-gray-200 rounded-full" />
                        </div>
                        
                        {/* Face outline */}
                        <div className="relative mx-auto mt-12 w-40 h-48">
                          <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-[40%]" />
                          
                          {/* Scan lines */}
                          <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                          <div className="absolute top-2/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
                          <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
                          
                          {/* Detection points */}
                          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                        </div>
                        
                        {/* Analysis results preview */}
                        <div className="absolute bottom-6 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">Skin Analysis</p>
                              <p className="text-[10px] text-gray-500">AI-powered scan</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="w-4/5 h-full bg-primary rounded-full" />
                            </div>
                            <span className="text-[10px] text-gray-500">85%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating card - Skin Type */}
                  <div className="absolute -right-4 top-1/4 bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Normal Skin</p>
                        <p className="text-[10px] text-gray-500">Detected</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating card - Hydration */}
                  <div className="absolute -left-4 bottom-1/3 bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Hydration</p>
                        <p className="text-[10px] text-gray-500">Good level</p>
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
                    <div className="mt-6">
                      <Link
                        to="/products"
                        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                      >
                        Learn more
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-muted p-8">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {benefits.map((benefit) => {
                    const Icon = benefit.icon
                    return (
                      <div
                        key={benefit.title}
                        className="flex flex-col items-center justify-center rounded-2xl bg-card p-6 text-center shadow-sm border border-border"
                      >
                        <Icon className="h-8 w-8 text-primary" />
                        <p className="mt-3 text-sm font-medium text-card-foreground">{benefit.title}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                The Cosmetics Finder Difference
              </span>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Why Trust Cosmetics Finder
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We combine advanced AI technology with dermatologist expertise to deliver
                personalized skincare recommendations that actually work. Our mission is to
                help everyone discover their perfect skincare routine.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-12 text-center text-primary-foreground shadow-2xl sm:p-16">
            <div className="absolute top-0 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-white/10" />

            <div className="relative z-10">
              <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
                Ready to Transform Your Skincare Routine?
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
                Discover your perfect skincare regimen with AI-powered recommendations.
                Start your journey to healthier, glowing skin today.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="group"
                >
                  <Link to={ROUTES.REGISTER}>
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link to="/products">
                    Browse Products
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
