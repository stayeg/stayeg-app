'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Eye,
  Target,
  Heart,
  IndianRupee,
  Smartphone,
  Users,
  ShieldCheck,
  Star,
  Award,
  Trophy,
  ThumbsUp,
  Globe,
  Clock,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Instagram,
  ExternalLink,
  Rocket,
  Sparkles,
  Layers,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        show: { transition: { staggerChildren: 0.08 } },
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
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }: { target: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Trust & Transparency',
    description: 'Every PG listed on StayEg undergoes a physical verification by our field team. We publish authentic reviews, unedited photos, and transparent pricing so tenants can book with confidence.',
  },
  {
    icon: IndianRupee,
    title: 'Zero Brokerage for Tenants',
    description: 'Tenants never pay a single rupee to search, browse, or book on StayEg. PG owners pay a straightforward, disclosed platform fee — no hidden charges, no surprise add-ons.',
  },
  {
    icon: Heart,
    title: 'Tenant-First Design',
    description: 'Every product decision — from instant complaint resolution to secure in-app payments — begins with a simple question: does this make the tenant\'s life easier and safer?',
  },
  {
    icon: Smartphone,
    title: 'Technology as a Differentiator',
    description: 'Our AI-powered matching engine pairs tenants with PGs based on commute distance, lifestyle preferences, and budget. Automated rent reminders, digital KYC, and real-time availability tracking set us apart from paper-based alternatives.',
  },
  {
    icon: Users,
    title: 'Community at Scale',
    description: 'Moving to a new city is isolating. StayEg\'s in-app community groups, local event boards, and interest-based forums help tenants build a support network from day one.',
  },
  {
    icon: Shield,
    title: 'Safety Without Compromise',
    description: 'Mandatory Aadhaar and PAN verification for all users, a 24/7 emergency helpline, verified vendor access, and a structured PG safety audit protocol form the backbone of our trust framework.',
  },
];

const STATS = [
  { label: 'Verified PGs', value: 10000, suffix: '+', icon: Building },
  { label: 'Active Tenants', value: 50000, suffix: '+', icon: Users },
  { label: 'Cities Across India', value: 20, suffix: '+', icon: Globe },
  { label: 'Platform Rating', value: 4.5, suffix: '/5', icon: Star },
];

const TEAM = [
  {
    name: 'Rahul Sharma',
    role: 'CEO & Co-Founder',
    bio: 'Rahul spent four years at McKinsey advising consumer-tech companies before founding StayEg in 2024, after his own frustrating relocation to Bangalore exposed the systemic gaps in India\'s PG market. He holds an MBA from IIM Ahmedabad and a B.Tech from IIT Delhi.',
    seed: 'rahul-sharma',
  },
  {
    name: 'Priya Patel',
    role: 'CTO & Co-Founder',
    bio: 'Priya brings 12 years of engineering leadership from Microsoft and Flipkart. She architected StayEg\'s real-time booking engine, AI-powered recommendation system, and end-to-end payment pipeline that processes thousands of transactions daily.',
    seed: 'priya-patel',
  },
  {
    name: 'Arjun Reddy',
    role: 'VP, Operations',
    bio: 'Previously a senior ops lead at Swiggy, where he scaled city operations to 30+ markets. Arjun oversees StayEg\'s on-ground verification team, vendor supply chain, and field support operations across India.',
    seed: 'arjun-reddy',
  },
  {
    name: 'Meera Krishnan',
    role: 'Head of Design & Product',
    bio: 'A former design lead at Google and Razorpay, Meera has shipped products used by millions. She leads StayEg\'s design system, ensuring that PG discovery and management feel as intuitive as ordering food online.',
    seed: 'meera-krishnan',
  },
];

const CHANGELOG = [
  {
    version: 'v3.0',
    date: 'April 2026',
    title: 'Enterprise & Multi-Property Tools',
    description: 'Launched multi-property dashboards for PG chains, advanced revenue analytics, staff shift optimisation, and API integrations for property management firms. Cross-city portfolio management now available in a single view.',
    icon: Sparkles,
  },
  {
    version: 'v2.0',
    date: 'January 2025',
    title: 'Community & Vendor Ecosystem',
    description: 'Introduced in-app community groups and forums for tenants to connect. Added end-to-end vendor management with service tracking, staff shift scheduling, and a structured complaint escalation workflow with SLA monitoring.',
    icon: Layers,
  },
  {
    version: 'v1.0',
    date: 'November 2024',
    title: 'Platform Launch',
    description: 'Went live with the core PG booking engine — verified listings, secure UPI and card payments, multi-bed room configurations, tenant complaints, and real-time availability tracking across 5 cities.',
    icon: Rocket,
  },
];

const AWARDS = [
  { title: 'Top 10 PropTech Startup 2025', subtitle: 'YourStory India', icon: Trophy },
  { title: 'Most Trusted PG Platform 2025', subtitle: 'Consumer Choice Awards', icon: Award },
  { title: '10,000+ Verified PG Partners', subtitle: 'Active & Growing', icon: ThumbsUp },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AboutPage() {
  const { setCurrentView } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================================ */}
      {/*  1. Header                                                    */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-muted to-background border-b pt-8 pb-6">
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={() => setCurrentView('LANDING')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-teal transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-brand-teal/15 flex items-center justify-center">
              <Shield className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">About StayEg</h1>
              <p className="text-sm text-muted-foreground">Building trust in India's PG accommodation market</p>
            </div>
          </div>

          <Badge variant="outline" className="mt-2 text-xs text-muted-foreground border-gold/20 shadow-gold-sm">
            Est. 2024
          </Badge>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. Our Story                                                 */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-8">
        <FadeIn>
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-lg bg-brand-deep-light flex items-center justify-center">
              <Building className="size-4 text-brand-teal" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Our Story</h2>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <p>
              In 2024, over 40 million Indians relocated to a new city for work or education. Nearly 70% of them reported encountering fraud, hidden charges, or significantly misrepresented living conditions during their PG search. Our co-founder Rahul Sharma experienced this first-hand when he moved to Bangalore from Delhi — weeks of unverified broker listings, doctored photographs, and lease agreements filled with fine print.
            </p>
            <p>
              That frustration became StayEg. We started with a straightforward premise: every PG listing should reflect reality, every price should be transparent, and every tenant should have a reliable channel to raise concerns. What began as a curated directory of 50 verified properties in Bangalore has grown into a full-stack platform covering 20+ Indian cities, with over 10,000 physically verified PGs and 50,000 active tenants.
            </p>
            <p>
              StayEg is not just a marketplace — it is an operating system for the PG economy. We connect tenants, PG owners, and local service vendors through a single interface. Our AI-powered matching engine considers commute proximity, lifestyle fit, and budget. Our on-ground verification team inspects every listed property. And our in-app payment system, complaint workflow, and community tools ensure that the living experience extends far beyond move-in day.
            </p>
          </div>
        </FadeIn>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  3. Mission & Vision                                         */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Mission &amp; Vision</h2>
        </FadeIn>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <FadeIn delay={0.1}>
            <Card className="border-brand-teal/20 shadow-gold-sm h-full">
              <CardContent className="p-6">
                <div className="size-10 rounded-xl bg-brand-teal/15 flex items-center justify-center mb-4">
                  <Target className="size-5 text-brand-teal" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Our Mission</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To eliminate information asymmetry in India's PG market. Every listing is physically verified, every rupee of pricing is disclosed upfront, and every tenant has access to secure payments, structured complaint resolution, and a genuine community. We exist to make finding a PG as trustworthy as booking a hotel.
                </p>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Card className="border-brand-deep/20 h-full">
              <CardContent className="p-6">
                <div className="size-10 rounded-xl bg-brand-deep-light flex items-center justify-center mb-4">
                  <Eye className="size-5 text-brand-teal" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Our Vision</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To become the operating layer for PG accommodation across India — the platform students and working professionals reach for first when moving to any city, and the management tool PG owners rely on to run their business efficiently.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  4. Our Values                                                */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Our Values</h2>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <StaggerItem key={v.title}>
                <Card className="border-border hover:border-brand-teal/30 transition-colors h-full">
                  <CardContent className="p-5">
                    <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center mb-3">
                      <Icon className="size-4 text-brand-teal" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{v.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  5. Key Stats                                                 */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 text-center">StayEg in Numbers</h2>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.label}>
                <Card className="border-gold/20 shadow-gold-sm text-center">
                  <CardContent className="p-5 flex flex-col items-center gap-2">
                    <div className="size-10 rounded-full bg-brand-teal/15 flex items-center justify-center">
                      <Icon className="size-5 text-brand-teal" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">
                      <AnimatedCounter target={s.value} suffix={s.suffix} />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  6. Our Team                                                  */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 text-center">Meet Our Team</h2>
          <p className="text-sm text-muted-foreground mb-8 text-center max-w-xl mx-auto">
            Our leadership team combines deep experience in consumer technology, on-ground operations, and product design to build a platform that India's PG market has needed for years.
          </p>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {TEAM.map((member) => (
            <StaggerItem key={member.name}>
              <Card className="border-border hover:border-brand-teal/30 transition-colors text-center h-full">
                <CardContent className="p-6 flex flex-col items-center">
                  <Avatar className="size-20 mb-4 ring-2 ring-brand-teal/20 ring-offset-2 ring-offset-background">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.seed}`}
                      alt={member.name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-brand-teal to-brand-deep text-white text-sm font-semibold">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-sm font-semibold text-foreground">{member.name}</h3>
                  <Badge variant="secondary" className="mt-1 mb-3 text-[11px] bg-brand-teal/10 text-brand-teal border-0">
                    {member.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">{member.bio}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  7. Platform Updates / Changelog                              */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Platform Updates</h2>
          <p className="text-sm text-muted-foreground mb-8">Key milestones in StayEg's journey from idea to India's fastest-growing PG platform.</p>
        </FadeIn>

        <div className="relative ml-4 sm:ml-6 border-l-2 border-brand-teal/20 space-y-8">
          {CHANGELOG.map((entry, i) => {
            const Icon = entry.icon;
            return (
              <FadeIn key={entry.version} delay={i * 0.1}>
                <div className="relative pl-6 sm:pl-8">
                  {/* Dot */}
                  <div className="absolute -left-[calc(0.5rem+1px)] sm:-left-[calc(0.75rem+1px)] top-1 size-3 rounded-full bg-brand-teal ring-4 ring-background" />

                  <Card className="border-border hover:border-brand-teal/20 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
                          <Icon className="size-4 text-brand-teal" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-brand-teal/20">
                              {entry.version}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" />
                            {entry.date}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
                    </CardContent>
                  </Card>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  8. Awards & Recognition                                      */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 text-center">Awards &amp; Recognition</h2>
        </FadeIn>

        <StaggerContainer className="flex flex-wrap justify-center gap-4">
          {AWARDS.map((award) => {
            const Icon = award.icon;
            return (
              <StaggerItem key={award.title}>
                <Card className="border-gold/20 shadow-gold-sm hover:shadow-gold transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-brand-sage/15 flex items-center justify-center shrink-0">
                      <Icon className="size-6 text-brand-sage" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{award.title}</h3>
                      <p className="text-xs text-muted-foreground">{award.subtitle}</p>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ============================================================ */}
      {/*  9. Contact                                                   */}
      {/* ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 py-10 pb-16">
        <FadeIn>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 text-center">Get in Touch</h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="border-gold/20 shadow-gold-sm max-w-lg mx-auto">
            <CardContent className="p-6 space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
                  <Mail className="size-4 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm text-foreground">hello@stayeg.in</p>
                </div>
              </div>

              <Separator />

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
                  <Phone className="size-4 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-sm text-foreground">+91 80-4567-8900</p>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
                  <MapPin className="size-4 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Office</p>
                  <p className="text-sm text-foreground">
                    StayEg Technologies Private Limited<br />
                    3rd Floor, Innovation Hub<br />
                    Koramangala, Bangalore 560034<br />
                    Karnataka, India
                  </p>
                </div>
              </div>

              <Separator />

              {/* Social links */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Follow Us</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="size-9 border-border hover:border-brand-teal/30 hover:bg-brand-teal/10">
                    <Twitter className="size-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-9 border-border hover:border-brand-teal/30 hover:bg-brand-teal/10">
                    <Linkedin className="size-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-9 border-border hover:border-brand-teal/30 hover:bg-brand-teal/10">
                    <Instagram className="size-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-9 border-border hover:border-brand-teal/30 hover:bg-brand-teal/10">
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Business hours */}
              <div className="pt-2">
                <p className="text-[11px] text-muted-foreground text-center">
                  Business Hours: Monday to Saturday, 9:00 AM - 6:00 PM IST
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </section>

      {/* Mobile bottom spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
