import { useState, useEffect, useCallback } from 'react'
import { Link, Navigate } from 'react-router'
import {
  Brain,
  Sparkles,
  Heart,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Camera,
  Layers,
  CheckCircle2,
  Tag,
  Flame,
  Sun,
  Droplets,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROUTES, getDashboardRoute } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface AdBanner {
  id: string
  tag: string
  title: string
  subtitle: string
  discount?: string
  bgGradient: string
  badgeBg: string
  link: string
  buttonText: string
  icon: typeof Sparkles
}

const PROMO_SLIDES: AdBanner[] = [
  {
    id: 'slide-1',
    tag: 'Featured Promotion',
    title: 'Hydration & Barrier Repair Essentials',
    subtitle: 'Nourish dry & sensitive skin with deep ceramides and hyaluronic acid formulas.',
    discount: 'Up to 25% OFF',
    bgGradient: 'from-purple-900/90 via-indigo-900/80 to-purple-950/90',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    link: '/products',
    buttonText: 'Shop Hydration Sale',
    icon: Droplets,
  },
  {
    id: 'slide-2',
    tag: 'AI Recommendation Spotlight',
    title: 'Clinically Proven Blemish & Acne Care',
    subtitle: 'Target breakouts with AI-selected gentle salicylic acid & niacinamide solutions.',
    discount: 'Buy 2 Get 10% Off',
    bgGradient: 'from-pink-900/90 via-rose-900/80 to-pink-950/90',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    link: '/products',
    buttonText: 'Explore Acne Solutions',
    icon: ShieldAlert,
  },
  {
    id: 'slide-3',
    tag: 'Seasonal Must-Have',
    title: 'Daily High-Protection Sunscreens (SPF 50+)',
    subtitle: 'Lightweight, invisible finish with broad spectrum UV protection for all skin types.',
    discount: 'Free Shipping',
    bgGradient: 'from-amber-950/90 via-orange-950/80 to-amber-900/90',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    link: '/products',
    buttonText: 'Discover Sunscreens',
    icon: Sun,
  },
]

const SKIN_CONCERNS = [
  {
    title: 'Deep Hydration',
    description: 'For dry, flaky, or tight skin needing moisture balance',
    icon: Droplets,
    color: 'text-sky-500 dark:text-sky-400',
    bg: 'bg-sky-500/10 dark:bg-sky-500/20',
    link: '/products',
  },
  {
    title: 'Acne & Pores',
    description: 'Target breakouts, blackheads, and excess sebum',
    icon: ShieldAlert,
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    link: '/products',
  },
  {
    title: 'Sun Protection',
    description: 'Broad spectrum UV defense to prevent photoaging',
    icon: Sun,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    link: '/products',
  },
  {
    title: 'Soothing & Redness',
    description: 'Calm sensitive, irritated, or compromised skin barrier',
    icon: Heart,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    link: '/products',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'AI Skin Diagnosis',
    description:
      'Upload a selfie or complete our smart skin assessment. Our AI analyzes your hydration, pore clarity, redness, and oil balance.',
    icon: Camera,
    badge: 'Quick & Accurate',
  },
  {
    step: '02',
    title: 'Ingredient Compatibility Match',
    description:
      'Our intelligent algorithm cross-references thousands of skincare formulations to find what actually works for your skin chemistry.',
    icon: Brain,
    badge: 'Smart Matching',
  },
  {
    step: '03',
    title: 'Direct Marketplace Purchase',
    description:
      'Order genuine, dermatologist-approved skincare directly from verified merchants with transparent reviews and prompt delivery.',
    icon: ShoppingBag,
    badge: 'Verified Merchants',
  },
]

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length)
  }, [])

  useEffect(() => {
    if (isHovered) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [isHovered, nextSlide])

  if (isLoading) return <LoadingSpinner className="min-h-screen" />
  if (isAuthenticated && user) return <Navigate to={getDashboardRoute(user.role)} replace />

  const activeSlide = PROMO_SLIDES[currentSlide]
  const SlideIcon = activeSlide.icon

  return (
    <div className="overflow-hidden">
      {/* 1. Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-12 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="absolute top-10 left-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Clear Value Proposition */}
            <div className="space-y-8 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>AI Skin Diagnosis & Skincare Marketplace</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.15]">
                Smart AI Analysis.{' '}
                <span className="bg-gradient-to-r from-primary via-purple-600 to-accent bg-clip-text text-transparent">
                  Personalized Skincare You Can Buy.
                </span>
              </h1>

              <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Take the guesswork out of beauty shopping. Scan your skin with advanced AI to understand your exact skin concerns, then instantly purchase dermatologist-backed products formulated specifically for you.
              </p>

              {/* Dual Primary Call-to-Actions */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  asChild
                  className="group font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 h-13 px-6 text-base"
                >
                  <Link to={ROUTES.REGISTER}>
                    <Camera className="mr-2 h-5 w-5" />
                    Start Free AI Skin Scan
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="font-semibold h-13 px-6 text-base border-border hover:bg-muted"
                >
                  <Link to="/products">
                    <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
                    Browse Skincare Shop
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <span>100% Genuine Brands</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Zap className="h-5 w-5 text-accent shrink-0" />
                  <span>Instant AI Diagnosis</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground col-span-2 sm:col-span-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>Verified Merchants</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive AI Scan to Product Flow Mockup */}
            <div className="relative lg:col-span-5 flex items-center justify-center">
              <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-purple-600/20 rounded-[3rem] blur-[60px] opacity-70" />

                {/* Phone Container Mock */}
                <div className="relative mx-auto w-72 sm:w-80 h-[520px] bg-gradient-to-b from-gray-900 to-zinc-900 rounded-[3rem] p-3.5 shadow-2xl border border-white/10">
                  <div className="relative w-full h-full bg-slate-950 text-white rounded-[2.4rem] overflow-hidden flex flex-col justify-between p-5">
                    {/* Top status header */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                      <span className="flex items-center gap-1 text-primary font-semibold">
                        <Sparkles className="h-3.5 w-3.5" /> AI Scan
                      </span>
                      <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                        LIVE READY
                      </span>
                    </div>

                    {/* Face Scan Reticle Visual */}
                    <div className="relative mx-auto my-auto w-44 h-48 flex items-center justify-center">
                      <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-[45%] animate-pulse" />
                      
                      {/* Scanning Line */}
                      <div className="absolute top-1/4 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-bounce" style={{ animationDuration: '2s' }} />

                      {/* Detected Target Points */}
                      <div className="absolute top-1/4 left-8 flex items-center gap-1 bg-zinc-900/90 border border-primary/40 rounded-md px-2 py-0.5 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] text-zinc-200">Hydration 88%</span>
                      </div>

                      <div className="absolute bottom-1/4 right-4 flex items-center gap-1 bg-zinc-900/90 border border-accent/40 rounded-md px-2 py-0.5 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                        <span className="text-[10px] text-zinc-200">Mild Redness</span>
                      </div>

                      <div className="w-24 h-28 border border-white/10 rounded-full flex items-center justify-center bg-white/5">
                        <Brain className="w-10 h-10 text-primary/70 animate-pulse" />
                      </div>
                    </div>

                    {/* Matched Product Preview Card at Bottom */}
                    <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3 shadow-lg backdrop-blur-md">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Best AI Match (98%)
                        </span>
                        <span className="text-[11px] font-bold text-emerald-400">In Stock</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 border border-primary/30">
                          <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">Centella Calming Serum</p>
                          <p className="text-[10px] text-zinc-400 truncate">Soothes redness & repairs barrier</p>
                        </div>
                        <span className="text-xs font-bold text-white whitespace-nowrap">32,000 Ks</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Badges for Visual Depth */}
                <div className="absolute -left-6 top-1/4 bg-card text-card-foreground rounded-2xl px-4 py-2.5 shadow-xl border border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-500">
                    <Heart className="w-4 h-4 fill-pink-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Barrier Score: 94%</p>
                    <p className="text-[10px] text-muted-foreground">Optimal balance</p>
                  </div>
                </div>

                <div className="absolute -right-4 bottom-1/4 bg-card text-card-foreground rounded-2xl px-4 py-2.5 shadow-xl border border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">1,200+ Products</p>
                    <p className="text-[10px] text-muted-foreground">Tested & Ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Sponsored & Promotional Advertisement Slider */}
      <section
        className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50">
          <div className={`relative p-8 sm:p-10 md:p-12 bg-gradient-to-r ${activeSlide.bgGradient} text-white transition-all duration-700`}>
            <div className="relative z-10 grid gap-6 md:grid-cols-12 md:items-center">
              <div className="space-y-4 md:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${activeSlide.badgeBg} text-xs uppercase tracking-wider font-semibold py-1 px-3`}>
                    <SlideIcon className="w-3.5 h-3.5 mr-1 inline" />
                    {activeSlide.tag}
                  </Badge>
                  {activeSlide.discount && (
                    <Badge className="bg-accent text-white font-bold text-xs py-1 px-3">
                      {activeSlide.discount}
                    </Badge>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {activeSlide.title}
                </h2>

                <p className="text-sm sm:text-base text-zinc-200/90 max-w-xl">
                  {activeSlide.subtitle}
                </p>

                <div className="pt-2">
                  <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 font-bold shadow-lg">
                    <Link to={activeSlide.link}>
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {activeSlide.buttonText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="hidden md:flex md:col-span-4 justify-center items-center">
                <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-4 text-center shadow-inner animate-pulse">
                  <SlideIcon className="w-12 h-12 text-white mb-2" />
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Merchant Partner</span>
                  <span className="text-sm font-bold text-white">Verified Brand</span>
                </div>
              </div>
            </div>

            {/* Slider Navigation Buttons */}
            <div className="absolute right-4 bottom-4 z-20 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextSlide}
                aria-label="Next slide"
                className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Slide Indicator Dots */}
            <div className="absolute left-8 bottom-4 sm:bottom-6 z-20 flex items-center gap-2">
              {PROMO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works: The 3-Step Journey (AI -> Matching -> Shopping) */}
      <section className="py-24 bg-muted/40 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 px-3 py-1 font-semibold text-primary">
              Simple 3-Step Process
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              How Cosmetic Finder Works
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground">
              From scanning your skin to delivering the ideal skincare regimen directly to your door.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon
              return (
                <Card
                  key={item.step}
                  className="relative overflow-hidden border-border bg-card shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
                >
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-3xl font-black text-muted-foreground/30">{item.step}</span>
                    </div>

                    <Badge variant="outline" className="mb-3 text-xs font-semibold text-muted-foreground">
                      {item.badge}
                    </Badge>

                    <h3 className="text-xl font-bold text-card-foreground mb-3">{item.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" asChild className="font-bold bg-primary text-primary-foreground">
              <Link to={ROUTES.REGISTER}>
                Experience It Now — Free Skin Scan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Shop by Skin Concern / Categories */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Curated Collections
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
                Shop Skincare by Concern
              </h2>
              <p className="mt-2 text-muted-foreground">
                Find products tailored for your specific skin goals and dermatological needs.
              </p>
            </div>
            <Button variant="outline" asChild className="self-start md:self-auto">
              <Link to="/products">
                View Full Catalog
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SKIN_CONCERNS.map((concern) => {
              const Icon = concern.icon
              return (
                <Link
                  key={concern.title}
                  to={concern.link}
                  className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${concern.bg} ${concern.color} mb-4 transition-transform group-hover:scale-110`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    {concern.title}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {concern.description}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us / Trust Badges */}
      <section className="py-20 bg-muted/20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Our Commitment
            </span>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Why Shop & Analyze With Us?
            </h2>
            <p className="mt-3 text-muted-foreground">
              We bridge artificial intelligence with authentic skincare commerce.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Accurate AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Deep learning algorithms that analyze skin hydration, texture, redness, and pores in seconds.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">100% Genuine Skincare</h3>
              <p className="text-sm text-muted-foreground">
                Every merchant is verified and products are certified authentic, safe, and stored in optimal conditions.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                <Layers className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Personalized Matching</h3>
              <p className="text-sm text-muted-foreground">
                No more wasted money on products that cause irritation. Get matched with ingredients that work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Final Call to Action Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-r from-primary via-purple-700 to-accent p-10 sm:p-14 text-white text-center shadow-2xl overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-black/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready for Healthier, Radiant Skin?
            </h2>
            <p className="text-base sm:text-lg text-white/90">
              Join thousands of buyers discovering their tailored skincare routine with AI analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-zinc-100 font-bold h-12 px-8">
                <Link to={ROUTES.REGISTER}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Started Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-transparent border-white text-white hover:bg-white/10 font-semibold h-12 px-8">
                <Link to="/products">
                  Explore Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

