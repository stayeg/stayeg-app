'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Search, MapPin, Users, Building2, Star, ChevronRight,
  Shield, Banknote, Smartphone, UsersRound, Lock, Headphones,
  ArrowRight, CheckCircle2, Sparkles, Wifi, Snowflake,
  UtensilsCrossed, TrainFront, BedDouble, Quote,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/use-app-store';
import { CITIES } from '@/lib/constants';
import type { PGGender } from '@/lib/types';

// ============================
// Animated Counter
// ============================
function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    const numStr = target.replace(/[^0-9]/g, '');
    const numTarget = parseInt(numStr, 10);
    if (!numStr || isNaN(numTarget)) return;
    const prefix = target.match(/^[^0-9]*/)?.[0] || '';
    const endSuffix = target.match(/[^0-9]*$/)?.[0] || '';
    let current = 0;
    const increment = Math.ceil(numTarget / 60);
    const timer = setInterval(() => {
      current += increment;
      if (current >= numTarget) {
        current = numTarget;
        clearInterval(timer);
      }
      setDisplay(`${prefix}${current.toLocaleString('en-IN')}${endSuffix}${suffix}`);
    }, 25);
    return () => clearInterval(timer);
  }, [target, suffix, isInView]);

  return <span ref={ref}>{display}</span>;
}

// ============================
// Scroll Animation Wrapper
// ============================
function FadeInSection({ children, className, delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================
// Section Heading
// ============================
function SectionHeading({ badge, title, highlight, description }: {
  badge?: string;
  title: string;
  highlight?: string;
  description?: string;
}) {
  return (
    <FadeInSection className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
      {badge && (
        <Badge className="mb-3 px-3 py-1 text-xs font-medium bg-primary/10 text-primary border-primary/20">
          {badge}
        </Badge>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
        {title}{' '}
        {highlight && (
          <span className="text-primary">{highlight}</span>
        )}
      </h2>
      {description && (
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">{description}</p>
      )}
    </FadeInSection>
  );
}

// ============================
// Hero Section
// ============================
export default function HeroSection() {
  const { searchFilters, setSearchFilters, setCurrentView } = useAppStore();
  const [localCity, setLocalCity] = useState(searchFilters.city || 'Bangalore');
  const [localGender, setLocalGender] = useState<string>(searchFilters.gender || 'ALL');
  const [localQuery, setLocalQuery] = useState(searchFilters.query || '');
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const handleSearch = () => {
    setSearchFilters({
      city: localCity,
      gender: localGender as PGGender | 'ALL',
      query: localQuery,
    });
    setCurrentView('PG_LISTING');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCityClick = (city: string) => {
    setSearchFilters({ ...searchFilters, city });
    setLocalCity(city);
    handleSearch();
  };

  return (
    <div className="relative">
      {/* ===================== */}
      {/* 1. HERO — Clean white */}
      {/* ===================== */}
      <section className="relative bg-background pt-8 pb-12 md:pt-14 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-5"
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-primary" />
              Trusted by 50,000+ Tenants &bull; 10,000+ Verified PGs
            </span>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-center max-w-3xl mx-auto mb-8"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 leading-snug">
              Your Next PG Home is{' '}
              <span className="text-primary">One Search Away</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              10,000+ verified PGs across 20+ cities. Zero brokerage, real photos, instant booking. Join 50,000+ tenants who found their home through StayEg.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl mx-auto mb-5"
          >
            <div className="bg-card rounded-xl border border-gold/30 shadow-gold-sm p-1.5 focus-within:ring-1 ring-gold">
              <div className="flex flex-col sm:flex-row gap-1.5">
                {/* City */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 min-w-0 sm:min-w-[140px]">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <Select value={localCity} onValueChange={setLocalCity}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto focus:ring-0 w-full text-sm">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="flex-1 flex items-center gap-2 px-3 py-2">
                  <Search className="size-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Search by area, PG name..."
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
                  />
                </div>

                {/* Gender */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 min-w-0 sm:min-w-[120px]">
                  <Users className="size-4 text-muted-foreground shrink-0" />
                  <Select value={localGender} onValueChange={setLocalGender}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto focus:ring-0 w-full text-sm">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Button */}
                <Button
                  onClick={handleSearch}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 h-10 text-sm font-medium"
                >
                  <Search className="size-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </div>
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {[
                { label: 'WiFi', icon: Wifi },
                { label: 'AC', icon: Snowflake },
                { label: 'Meals', icon: UtensilsCrossed },
                { label: 'Near Metro', icon: TrainFront },
                { label: 'Single', icon: BedDouble },
              ].map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => { setLocalQuery(tag.label); handleSearch(); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground bg-muted/50 rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                >
                  <tag.icon className="size-3" />
                  {tag.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* ===================== */}
      {/* 2. HOW IT WORKS       */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            badge="Simple & Quick"
            title="How StayEg"
            highlight="Works"
            description="From search to move-in in under 5 minutes. No broker, no hassle, no guesswork."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              { step: '01', icon: Search, title: 'Search & Discover', desc: 'Filter by city, locality, budget, amenities, and gender preference. Every listing has real photos and verified reviews.' },
              { step: '02', icon: CheckCircle2, title: 'Book Instantly', desc: 'Select your bed, confirm details, and pay securely. Get instant booking confirmation — no broker involved.' },
              { step: '03', icon: Building2, title: 'Move In Stress-Free', desc: 'Complete digital KYC, track your booking, and move in with confidence. Raise complaints in-app anytime.' },
            ].map((item, idx) => (
              <FadeInSection key={item.step} delay={idx * 0.1}>
                <Card className="border border-gold/20 shadow-gold-sm hover:shadow-gold transition-shadow group bg-card">
                  <CardContent className="p-5 md:p-6">
                    <div className="size-11 rounded-xl bg-primary flex items-center justify-center mb-4">
                      <item.icon className="size-5 text-white" />
                    </div>
                    <div className="text-xs font-bold text-muted-foreground mb-1">STEP {item.step}</div>
                    <h3 className="text-base font-bold text-foreground mb-1.5">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 3. WHY CHOOSE STAYEG  */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-section-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            badge="Why StayEg"
            title="The StayEg"
            highlight="Advantage"
            description="India's only full-stack PG platform — for tenants, owners, and service vendors."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Physically Verified PGs', desc: 'Our field team inspects every property. Real photos, genuine reviews, and accurate pricing — always.', color: 'bg-brand-lime/15 text-brand-lime' },
              { icon: Banknote, title: 'Zero Brokerage, Ever', desc: 'No middlemen, no booking fees, no convenience charges. The price you see is the price you pay.', color: 'bg-primary/10 text-primary' },
              { icon: Smartphone, title: 'Complete PG Management', desc: 'PG Owners: Automate rent collection, track occupancy, manage staff, and monitor complaints — all from your phone.', color: 'bg-brand-teal/10 text-brand-teal' },
              { icon: UsersRound, title: 'Built-In Community', desc: 'Connect with fellow tenants, find roommates, join local events, and never feel alone in a new city.', color: 'bg-chart-3/10 text-chart-3' },
              { icon: Lock, title: 'Bank-Grade Security', desc: '256-bit encrypted payments, Aadhaar/PAN KYC for all users, and PCI-DSS compliant gateways.', color: 'bg-brand-sage/10 text-brand-sage' },
              { icon: Headphones, title: 'Dedicated Support', desc: 'Mon–Sat, 9 AM–6 PM IST with a 2-hour response SLA. Emergency helpline available 24/7.', color: 'bg-destructive/10 text-destructive' },
            ].map((item, idx) => (
              <FadeInSection key={item.title} delay={idx * 0.05}>
                <Card className="border border-gold/20 shadow-gold-sm hover:shadow-gold hover:-translate-y-0.5 transition-all bg-card">
                  <CardContent className="p-5">
                    <div className={`size-10 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                      <item.icon className="size-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== */}
      {/* 4. FOR PG OWNERS      */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeInSection>
            <div className="rounded-2xl bg-section-dark p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
                    <Sparkles className="size-3" />
                    For PG Owners
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">
                    The Future of PG Management is{' '}
                    <span className="text-primary">Here</span>
                  </h2>
                  <p className="text-gray-300 mb-6 text-sm">
                    Run your PG business like a pro — automate rent, manage staff, track occupancy, and delight tenants. All from one dashboard.
                  </p>

                  <ul className="space-y-3 mb-8">
                    {[
                      'Accept bookings & manage beds from your phone',
                      'Automated rent reminders with UPI & card collection',
                      'Staff shift scheduling & attendance tracking',
                      'Real-time occupancy analytics & revenue dashboards',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                        <span className="text-gray-300 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 mb-5">
                    <Sparkles className="size-4 text-amber-400" />
                    <span className="text-white text-xs font-semibold">First 1000 Owners Get 1 Year FREE!</span>
                  </div>

                  <Button
                    onClick={() => setCurrentView('PRICING')}
                    className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 h-10 text-sm font-medium"
                  >
                    Start Free Trial
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>

                {/* Feature cards */}
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  {[
                    { icon: Smartphone, label: 'Mobile-First', value: 'Manage from anywhere' },
                    { icon: Banknote, label: 'Rent Collection', value: 'UPI, cards & auto reminders' },
                    { icon: Users, label: 'Staff Management', value: 'Shifts, attendance & tasks' },
                    { icon: Star, label: 'Smart Analytics', value: 'Revenue & occupancy insights' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <item.icon className="size-6 text-primary mb-2" />
                      <h4 className="text-white font-semibold text-sm mb-0.5">{item.label}</h4>
                      <p className="text-gray-300 text-xs">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===================== */}
      {/* 5. FOR VENDORS        */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-section-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeInSection>
            <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="bg-gradient-to-br from-brand-deep to-brand-teal p-8 md:p-10 flex flex-col justify-center min-h-[240px]">
                  <Badge className="mb-4 bg-white/15 backdrop-blur-sm text-white border-white/25 self-start">
                    For Service Providers
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-snug">
                    Grow Your Service Business with StayEg
                  </h2>
                  <p className="text-white text-sm">
                    Get verified leads from 10,000+ PGs. No marketing spend needed.
                  </p>
                </div>

                <div className="p-8 md:p-10">
                  <ul className="space-y-4 mb-6">
                    {[
                      { icon: UsersRound, title: 'Pre-Qualified Leads', desc: 'Receive genuine service requests only from verified PG owners in your area — no cold calling.' },
                      { icon: Building2, title: 'Smart Scheduling', desc: 'Set your availability, accept jobs on your terms, and manage your calendar from the app.' },
                      { icon: Star, title: 'Build Your Reputation', desc: 'Every completed job earns you ratings and reviews. Higher ratings mean more visibility and bookings.' },
                    ].map((item) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="size-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm mb-0.5">{item.title}</h4>
                          <p className="text-muted-foreground text-xs">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => setCurrentView('SIGNUP')}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/5 rounded-lg px-5 h-9 text-sm shadow-gold"
                  >
                    Register as Vendor
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===================== */}
      {/* 6. STATS              */}
      {/* ===================== */}
      <section className="py-12 md:py-14 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeInSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {[
                { icon: Building2, value: '10,000+', label: 'Verified PGs', color: 'bg-primary/10 text-primary' },
                { icon: Users, value: '50,000+', label: 'Happy Tenants', color: 'bg-brand-lime/15 text-brand-lime' },
                { icon: MapPin, value: '20+', label: 'Cities', color: 'bg-brand-teal/10 text-brand-teal' },
                { icon: Star, value: '4.5+', label: 'Avg Rating', color: 'bg-brand-sage/10 text-brand-sage' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.08 }}
                  className="bg-muted/50 rounded-xl p-4 md:p-5 text-center border border-border"
                >
                  <div className={`size-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <stat.icon className="size-5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground mb-0.5">
                    <AnimatedCounter target={stat.value} />
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===================== */}
      {/* 7. TRUST BADGES       */}
      {/* ===================== */}
      <section className="py-8 bg-section-muted border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeInSection>
            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
              {[
                { icon: Shield, label: 'Verified Properties', desc: 'Personally inspected', color: 'bg-brand-lime/15 text-brand-lime' },
                { icon: Banknote, label: 'Zero Brokerage', desc: 'No hidden charges', color: 'bg-primary/10 text-primary' },
                { icon: Lock, label: 'Secure Payments', desc: '256-bit encrypted', color: 'bg-brand-teal/10 text-brand-teal' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={`size-10 rounded-lg ${item.color} flex items-center justify-center`}>
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-xs">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===================== */}
      {/* 8. TESTIMONIALS       */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            badge="Testimonials"
            title="What Our Users"
            highlight="Say"
            description="Don't take our word for it — hear from tenants and PG owners who've experienced StayEg firsthand."
          />

          <FadeInSection>
            <div className="relative">
              <div className="hidden md:grid md:grid-cols-3 gap-4">
                {testimonials.map((t, idx) => (
                  <TestimonialCard key={idx} testimonial={t} />
                ))}
              </div>

              <div className="md:hidden">
                <div className="overflow-hidden">
                  <motion.div
                    className="flex"
                    animate={{ x: `-${testimonialIdx * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    {testimonials.map((t, idx) => (
                      <div key={idx} className="w-full shrink-0 px-1">
                        <TestimonialCard testimonial={t} />
                      </div>
                    ))}
                  </motion.div>
                </div>

                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={() => setTestimonialIdx((prev) => Math.max(0, prev - 1))} disabled={testimonialIdx === 0}
                    className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/10 hover:text-primary transition-colors">
                    <ChevronLeft className="size-4" />
                  </button>
                  <div className="flex gap-1.5">
                    {testimonials.map((_, idx) => (
                      <button key={idx} onClick={() => setTestimonialIdx(idx)}
                        className={`h-1.5 rounded-full transition-all ${idx === testimonialIdx ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`} />
                    ))}
                  </div>
                  <button onClick={() => setTestimonialIdx((prev) => Math.min(testimonials.length - 1, prev + 1))} disabled={testimonialIdx === testimonials.length - 1}
                    className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/10 hover:text-primary transition-colors">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===================== */}
      {/* 9. CTA               */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <FadeInSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Stop Searching. Start Living.
            </h2>
            <p className="text-white text-sm mb-6 max-w-lg mx-auto">
              50,000+ tenants have already found their home on StayEg. Zero brokerage, verified listings, and instant booking. Why wait?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Button onClick={() => setCurrentView('PG_LISTING')}
                className="bg-background text-primary hover:bg-muted rounded-lg px-6 h-10 text-sm font-semibold">
                <Search className="size-4 mr-1.5" />
                Find PG Now
              </Button>
              <Button onClick={() => setCurrentView('PRICING')}
                variant="outline"
                className="border-2 border-white/70 text-white hover:bg-white/15 rounded-lg px-6 h-10 text-sm font-semibold bg-transparent">
                <Building2 className="size-4 mr-1.5" />
                List Your PG
              </Button>
            </div>

            <div className="inline-flex items-center gap-1.5 text-white text-xs">
              <CheckCircle2 className="size-3.5" />
              100% Free for Tenants
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ===================== */}
      {/* 10. CITIES            */}
      {/* ===================== */}
      <section className="py-12 md:py-16 bg-section-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            badge="Our Presence"
            title="Find a PG in"
            highlight="Your City"
            description="StayEg is live in 20+ cities with 10,000+ verified properties. Tap your city to start exploring."
          />

          <FadeInSection>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-w-3xl mx-auto">
              {CITIES.map((city, idx) => (
                <motion.button
                  key={city}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCityClick(city)}
                  className="group bg-card rounded-xl border border-border p-3 text-center hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                >
                  <MapPin className="size-4 text-primary mx-auto mb-1.5" />
                  <div className="font-medium text-foreground text-xs">{city}</div>
                </motion.button>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>
    </div>
  );
}

// ============================
// Testimonials
// ============================
const testimonials = [
  { name: 'Priya Sharma', role: 'SDE at Infosys, Bangalore', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya', quote: 'I relocated from Jaipur to Bangalore and had just 3 days to find a PG. StayEg showed me verified options near Electronic City with real photos. I booked a single room with AC and meals in under 10 minutes. No broker, no surprise charges.', rating: 5 },
  { name: 'Arjun Patel', role: 'MBA Student, Delhi University', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arjun', quote: 'As a student, saving on brokerage was a big deal. StayEg helped me find a boys PG in Vijay Nagar for ₹8,000/month with WiFi and meals. The complaint feature is genuinely useful — my geyser was fixed within 24 hours.', rating: 5 },
  { name: 'Sneha Iyer', role: 'PG Owner, Pune (12 properties)', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sneha', quote: 'Before StayEg, managing rent collection for 12 PGs was a nightmare. Now I track occupancy, send automated reminders, and onboard tenants digitally. My vacancy rate dropped from 18% to 4% in just 6 months.', rating: 5 },
];

function TestimonialCard({ testimonial: { name, role, avatar, quote, rating } }: {
  testimonial: typeof testimonials[0];
}) {
  return (
    <Card className="border border-gold/20 shadow-gold-sm bg-card">
      <CardContent className="p-5">
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`size-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
          ))}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
        <div className="flex items-center gap-2.5 pt-3 border-t border-border">
          <img src={avatar} alt={name} className="size-8 rounded-full bg-muted" />
          <div>
            <div className="font-semibold text-foreground text-xs">{name}</div>
            <div className="text-muted-foreground text-[11px]">{role}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
