'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  GitCompareArrows,
  ShieldCheck,
  Home,
  Users,
  MapPin,
  Star,
  CreditCard,
  Clock,
  IndianRupee,
  Building2,
  BarChart3,
  Bell,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    step: 1,
    icon: Search,
    title: 'Search & Browse PGs',
    description:
      'Explore thousands of verified PG listings across 20+ Indian cities. Filter by locality, budget, amenities, gender preference, and user ratings to find your ideal accommodation.',
    color: 'bg-brand-teal/15 text-brand-teal',
  },
  {
    step: 2,
    icon: GitCompareArrows,
    title: 'Compare & Choose',
    description:
      'View detailed listings with real photos, verified reviews, and transparent pricing. Compare multiple PGs side by side on amenities, commute distance, and tenant feedback.',
    color: 'bg-brand-sage/15 text-brand-sage',
  },
  {
    step: 3,
    icon: ShieldCheck,
    title: 'Book & Pay Securely',
    description:
      'Select an available bed and book instantly. Pay securely via UPI, cards, or net banking through our PCI-DSS compliant payment gateway. Apply coupons for discounts.',
    color: 'bg-brand-deep-light text-brand-deep',
  },
  {
    step: 4,
    icon: Home,
    title: 'Move In & Enjoy',
    description:
      'Complete your KYC verification, receive your digital booking confirmation, and move into your new PG. Enjoy in-app rent tracking, complaint resolution, and community access.',
    color: 'bg-brand-teal/15 text-brand-teal',
  },
];

const TENANT_FEATURES = [
  {
    icon: MapPin,
    title: 'AI-Powered Matching',
    description: 'Our smart engine suggests PGs based on your commute distance, lifestyle preferences, and budget.',
  },
  {
    icon: Star,
    title: 'Verified Reviews',
    description: 'Every review comes from a real, verified tenant — no fake ratings, no hidden agendas.',
  },
  {
    icon: CreditCard,
    title: 'Zero Booking Fees',
    description: 'Tenants never pay a brokerage, service fee, or convenience charge. The listed price is what you pay.',
  },
  {
    icon: Bell,
    title: 'Instant Complaint Resolution',
    description: 'Raise issues directly from the app with photo evidence. Track resolution in real time.',
  },
];

const OWNER_FEATURES = [
  {
    icon: Building2,
    title: 'Easy Property Listing',
    description: 'Add your PG with room configurations, amenities, and photos in under 10 minutes.',
  },
  {
    icon: IndianRupee,
    title: 'Automated Rent Tracking',
    description: 'Track payments, send reminders, and generate receipts — all from a single dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description: 'Visual dashboards showing occupancy rates, revenue trends, and tenant feedback scores.',
  },
  {
    icon: Users,
    title: 'Tenant & Staff Management',
    description: 'Manage tenant check-ins, staff shifts, and vendor assignments from one place.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HowItWorksPage() {
  const { setCurrentView } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================================ */}
      {/*  Hero Section                                                 */}
      {/* ============================================================ */}
      <section className="relative bg-gradient-to-r from-brand-deep to-brand-teal text-white pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 size-32 rounded-full border-2 border-white" />
          <div className="absolute bottom-10 right-10 size-48 rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 rounded-full border border-white" />
        </div>

        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <button
            onClick={() => setCurrentView('LANDING')}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>

          <div className="text-center max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                How StayEg Works
              </h1>
              <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                Finding your ideal PG accommodation is as simple as 1-2-3-4. 
                From search to move-in, we&apos;ve got every step covered.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Steps Section                                                */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 -mt-8 relative z-20">
        <StaggerContainer className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <StaggerItem key={step.step}>
                <Card className="border-border hover:border-brand-teal/30 transition-all shadow-sm hover:shadow-md">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      {/* Step number + icon */}
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <div className={`size-12 rounded-2xl ${step.color} flex items-center justify-center`}>
                          <Icon className="size-6" />
                        </div>
                        <span className={`text-xs font-bold ${step.color.split(' ')[1]}`}>
                          Step {step.step}
                        </span>
                      </div>

                      {/* Connector line (not on last step) */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Step badge */}
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs font-bold border-brand-teal/30 text-brand-teal bg-brand-teal/5"
                      >
                        {String(step.step).padStart(2, '0')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Flowing line connecting steps on desktop */}
        <div className="hidden lg:block absolute left-[3.25rem] top-[3rem] bottom-[3rem] w-0.5 bg-gradient-to-b from-brand-teal/30 via-brand-sage/20 to-brand-teal/10 -z-10" />
      </section>

      {/* ============================================================ */}
      {/*  For Tenants                                                  */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-10">
        <FadeIn>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
              <Users className="size-4 text-brand-teal" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">For Tenants</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            Everything you need to find, book, and enjoy the perfect PG — all in one place.
          </p>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 gap-4">
          {TENANT_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.title}>
                <Card className="border-border hover:border-brand-teal/30 transition-colors h-full">
                  <CardContent className="p-5">
                    <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center mb-3">
                      <Icon className="size-4 text-brand-teal" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  For PG Owners                                                */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-brand-deep-light flex items-center justify-center">
              <Building2 className="size-4 text-brand-teal" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">For PG Owners</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            A complete management suite to run your PG business efficiently and grow your occupancy.
          </p>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 gap-4">
          {OWNER_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.title}>
                <Card className="border-border hover:border-brand-teal/30 transition-colors h-full">
                  <CardContent className="p-5">
                    <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center mb-3">
                      <Icon className="size-4 text-brand-teal" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  CTA Section                                                  */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-12 pb-16">
        <FadeIn>
          <Card className="border-brand-teal/20 bg-gradient-to-br from-brand-teal/10 via-brand-sage/5 to-background overflow-hidden">
            <CardContent className="p-8 sm:p-12 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-lg mx-auto"
              >
                <div className="size-14 rounded-2xl bg-gradient-to-r from-brand-deep to-brand-teal flex items-center justify-center mx-auto mb-5">
                  <Home className="size-7 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                  Ready to Get Started?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                  Join thousands of tenants and PG owners on StayEg. Whether you&apos;re looking for a 
                  home or listing one, we make the process simple, secure, and transparent.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white border-0 w-full sm:w-auto"
                    onClick={() => setCurrentView('SIGNUP')}
                  >
                    <UserPlus className="size-4 mr-2" />
                    Sign Up Free
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setCurrentView('LOGIN')}
                  >
                    <LogIn className="size-4 mr-2" />
                    Login
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </FadeIn>
      </section>

      {/* Mobile bottom spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
