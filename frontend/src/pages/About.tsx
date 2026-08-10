import { Link } from 'react-router'
import {
  Target,
  Eye,
  Brain,
  Globe,
  Zap,
  Lock,
  BarChart3,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { aboutImages } from '@/data/about'

export default function About() {
  const steps = [
    { num: '1', title: 'Upload Photo', desc: 'Take or upload a clear facial photo for analysis.' },
    { num: '2', title: 'AI Analysis', desc: 'Our model analyzes skin type, condition, and age estimation.' },
    { num: '3', title: 'Smart Matching', desc: 'Cross-references ingredient data with your skin profile.' },
    { num: '4', title: 'Recommendations', desc: 'Receive a personalized, optimized skincare routine.', final: true },
  ]

  const capabilities = [
    {
      icon: Brain,
      title: 'AI Skin Analysis',
      desc: 'Upload a photo and get instant insights on your skin type, conditions, and age estimation.',
    },
    {
      icon: Sparkles,
      title: 'Smart Recommendations',
      desc: 'Receive personalized product suggestions matched to your unique skin profile and concerns.',
    },
    {
      icon: ShoppingBag,
      title: 'Curated Marketplace',
      desc: 'Browse thousands of skincare products from trusted brands, filtered by your skin needs.',
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      desc: 'Use the platform in English, Myanmar, or Japanese — your language, your choice.',
    },
    {
      icon: Lock,
      title: 'Secure & Private',
      desc: 'Your data is protected with enterprise-grade security and privacy-first design.',
    },
    {
      icon: Zap,
      title: 'Instant Results',
      desc: 'Get AI-powered analysis in under 10 seconds with real-time product matching.',
    },
  ]

  return (
    <main className="flex-grow pt-32 pb-24">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-5 md:px-16 mb-12 md:mb-32 relative">
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="fade-in-up">
            <h1 className="font-display text-4xl md:text-[48px] font-bold leading-[56px] tracking-[-0.02em] text-on-surface mb-6">
              Pioneering the Future of <span className="text-primary-container">AI Skincare</span>
            </h1>
            <p className="text-lg leading-[28px] text-on-surface-variant mb-8 max-w-xl">
              Cosmetics Finder connects buyers seeking personalized skincare solutions with merchants selling skincare products, powered by AI skin analysis and smart product recommendations.
            </p>
            <div className="flex gap-4">
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center justify-center bg-primary-container text-deep-base px-8 py-3 rounded-full font-medium text-sm tracking-widest hover:bg-primary transition-colors"
              >
                Try AI Analysis
              </Link>
            </div>
          </div>
          <div className="relative fade-in-up fade-in-up-delay-200">
            <div className="rounded-2xl overflow-hidden relative glass-card p-2">
              <img
                className="w-full h-auto rounded-xl object-cover"
                src={aboutImages.hero.src}
                alt={aboutImages.hero.alt}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-base via-transparent to-transparent opacity-60" />
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="mx-auto max-w-6xl px-5 md:px-16 mb-12 md:mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 fade-in-up">
            <div className="rounded-2xl overflow-hidden glass-card p-2">
              <img
                className="w-full h-auto rounded-xl object-cover"
                src={aboutImages.story.src}
                alt={aboutImages.story.alt}
              />
            </div>
          </div>
          <div className="order-1 md:order-2 fade-in-up fade-in-up-delay-200">
            <div className="inline-block px-4 py-1 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary mb-4 text-xs font-semibold tracking-widest uppercase">
              Our Story
            </div>
            <h2 className="font-display text-2xl md:text-[32px] font-semibold leading-[40px] tracking-[-0.01em] mb-6">
              Decoding Beauty through Intelligence
            </h2>
            <p className="text-on-surface-variant mb-6">
              Consumers struggle to find skincare products suited to their individual skin types and concerns. Traditional e-commerce lacks personalization, leading to poor product choices and wasted spending.
            </p>
            <p className="text-on-surface-variant">
              Our proprietary AI model analyzes thousands of data points — from ingredient interactions to individual skin phenotypes — to construct a regimen that is unequivocally yours. We believe that clarity is the ultimate luxury.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-6xl px-5 md:px-16 mb-12 md:mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card rounded-[32px] p-10 fade-in-up hover:border-primary-container/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center mb-6">
              <Target className="w-6 h-6 text-primary-container" />
            </div>
            <h3 className="font-display text-2xl font-semibold mb-4">Our Mission</h3>
            <p className="text-on-surface-variant">
              To provide personalized skincare product recommendations based on AI analysis, increasing conversion rates through targeted product matching and merchant tools for product management and sales analytics.
            </p>
          </div>
          <div className="glass-card rounded-[32px] p-10 fade-in-up fade-in-up-delay-200 hover:border-primary-container/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center mb-6">
              <Eye className="w-6 h-6 text-primary-container" />
            </div>
            <h3 className="font-display text-2xl font-semibold mb-4">Our Vision</h3>
            <p className="text-on-surface-variant">
              A future where trial-and-error is obsolete. We envision a seamlessly integrated digital ecosystem where your biological needs instantly align with perfect product formulations through multi-vendor marketplace growth.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works (Timeline) */}
      <section className="mx-auto max-w-6xl px-5 md:px-16 mb-12 md:mb-32">
        <div className="text-center mb-16 fade-in-up">
          <h2 className="font-display text-2xl md:text-[32px] font-semibold leading-[40px] tracking-[-0.01em] mb-4">
            The Intelligence Engine
          </h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            A seamless four-step process engineered to deliver unprecedented accuracy. AI skin analysis processing completes in under 10 seconds.
          </p>
        </div>
        <div className="relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-outline-variant/30 -translate-y-1/2 z-0">
            <div className="h-full glow-line" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`glass-card rounded-2xl p-6 text-center fade-in-up${
                  i === 1 ? '-delay-100' : i === 2 ? '-delay-200' : i === 3 ? '-delay-300' : ''
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full border mx-auto flex items-center justify-center mb-4 relative ${
                    step.final
                      ? 'bg-primary-container/20 border-primary-container shadow-glow-lg'
                      : 'bg-surface-container border-primary-container/30 shadow-glow-sm'
                  }`}
                >
                  {step.final ? (
                    <BarChart3 className="w-6 h-6 text-primary-container" />
                  ) : (
                    <span className="font-display text-primary-container font-semibold">{step.num}</span>
                  )}
                </div>
                <h4 className="font-medium text-on-surface mb-2 text-sm tracking-wide">{step.title}</h4>
                <p className="text-xs text-on-surface-variant">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="mx-auto max-w-6xl px-5 md:px-16 mb-12 md:mb-32">
        <div className="text-center mb-12 fade-in-up">
          <h2 className="font-display text-2xl md:text-[32px] font-semibold leading-[40px] tracking-[-0.01em] mb-4">
            What You Can Do
          </h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            Everything you need for a personalized skincare journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon
            return (
              <div
                key={cap.title}
                className={`glass-card rounded-3xl p-8 fade-in-up hover:-translate-y-1 transition-transform${
                  i === 1 ? '-delay-100' : i === 2 ? '-delay-200' : i === 3 ? '-delay-300' : i === 4 ? '-delay-300' : ''
                }`}
              >
                <Icon className="w-8 h-8 text-primary-container mb-4" />
                <h4 className="font-display text-lg font-semibold mb-2">{cap.title}</h4>
                <p className="text-sm text-on-surface-variant">{cap.desc}</p>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
