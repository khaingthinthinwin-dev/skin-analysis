import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Brain, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'

export default function Home() {
  const { t } = useTranslation()

  const features = [
    {
      icon: Brain,
      title: 'AI Skin Analysis',
      description: 'Advanced AI technology analyzes your skin type and concerns to provide personalized recommendations.',
    },
    {
      icon: Sparkles,
      title: 'Smart Matching',
      description: 'Our intelligent algorithm matches you with the perfect products for your unique skin needs.',
    },
    {
      icon: ShoppingBag,
      title: 'Expert Products',
      description: 'Curated selection of premium skincare products from trusted brands and dermatologists.',
    },
  ]

  const steps = [
    { step: '1', title: 'Upload Photo', description: 'Take or upload a clear photo of your face' },
    { step: '2', title: 'Get Analysis', description: 'Our AI analyzes your skin in seconds' },
    { step: '3', title: 'Shop Products', description: 'Discover products tailored to your skin' },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {t('home.hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-10">
              <Button size="lg" asChild>
                <Link to={ROUTES.REGISTER}>
                  {t('home.hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Why Choose Cosmetics Finder?</h2>
            <p className="mt-4 text-muted-foreground">
              Powered by cutting-edge artificial intelligence
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title}>
                  <CardContent className="pt-6">
                    <Icon className="h-10 w-10 text-primary" />
                    <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-4 text-muted-foreground">Get personalized skincare in 3 simple steps</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {step.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-primary text-primary-foreground py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Ready to Transform Your Skincare Routine?</h2>
          <p className="mt-4 text-primary-foreground/80">
            Join thousands of users who have discovered their perfect skincare regimen.
          </p>
          <div className="mt-10">
            <Button size="lg" variant="secondary" asChild>
              <Link to={ROUTES.REGISTER}>
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
