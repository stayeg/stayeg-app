'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Gamepad2,
  Gift,
  CalendarDays,
  ShieldAlert,
  Users,
  BarChart3,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { BADGE } from '@/lib/constants';

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
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const COMING_SOON_FEATURES = [
  {
    icon: Gamepad2,
    title: 'Games & Fun',
    description: 'Play games with your PG neighbors',
    color: 'bg-brand-teal/15 text-brand-teal',
  },
  {
    icon: Gift,
    title: 'Rewards Program',
    description: 'Earn points for every booking & review',
    color: 'bg-brand-sage/15 text-brand-sage',
  },
  {
    icon: CalendarDays,
    title: 'Community Events',
    description: 'Local meetups, movie nights, sports',
    color: 'bg-brand-deep-light text-brand-deep',
  },
  {
    icon: ShieldAlert,
    title: 'Emergency SOS',
    description: 'One-tap emergency alert system',
    color: 'bg-red-100 text-red-600',
  },
  {
    icon: Users,
    title: 'Roommate Matching',
    description: 'AI-powered roommate compatibility',
    color: 'bg-brand-teal/15 text-brand-teal',
  },
  {
    icon: BarChart3,
    title: 'PG Comparison',
    description: 'Compare PGs side by side',
    color: 'bg-brand-sage/15 text-brand-sage',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ComingSoonSection() {
  const [notifiedFeatures, setNotifiedFeatures] = useState<Set<string>>(new Set());

  const handleNotify = (featureTitle: string) => {
    if (notifiedFeatures.has(featureTitle)) {
      toast.info(`You've already subscribed to ${featureTitle} updates!`);
      return;
    }
    setNotifiedFeatures((prev) => new Set(prev).add(featureTitle));
    toast.success(`You'll be notified when ${featureTitle} is live!`);
  };

  return (
    <section>
      <FadeIn>
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
            <Sparkles className="size-4 text-brand-teal" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Coming Soon</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Exciting new features we&apos;re building for you. Hit &quot;Notify Me&quot; to stay in the loop!
        </p>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMING_SOON_FEATURES.map((feature) => {
          const Icon = feature.icon;
          const isNotified = notifiedFeatures.has(feature.title);

          return (
            <StaggerItem key={feature.title}>
              <motion.div whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 24 } }}>
                <Card className="border-border hover:border-brand-teal/30 transition-colors h-full overflow-hidden relative">
                  {/* Coming Soon badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className={`${BADGE.purple} text-[10px] font-semibold border-0`}>
                      Coming Soon
                    </Badge>
                  </div>

                  <CardContent className="p-5">
                    <div className={`size-11 rounded-xl ${feature.color} flex items-center justify-center mb-3`}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <Button
                      variant={isNotified ? 'outline' : 'default'}
                      size="sm"
                      className={`w-full text-xs h-8 ${
                        isNotified
                          ? 'border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10'
                          : 'bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white border-0'
                      }`}
                      onClick={() => handleNotify(feature.title)}
                    >
                      {isNotified ? (
                        <>
                          <Bell className="size-3 mr-1.5" />
                          Subscribed
                        </>
                      ) : (
                        <>
                          <Bell className="size-3 mr-1.5" />
                          Notify Me
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}
