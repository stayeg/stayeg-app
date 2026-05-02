'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, ShieldCheck, Users, ArrowRight, X, Sparkles,
  MapPin, CreditCard, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ONBOARDING_KEY = 'stayeg_tenant_onboarding_seen';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  bgColor: string;
  accentColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to StayEg!',
    description:
      'Your one-stop platform for finding the perfect PG accommodation. Browse verified listings, book securely, and join a vibrant community of tenants.',
    icon: <Home className="size-10" />,
    gradient: 'from-brand-deep to-brand-teal',
    bgColor: 'bg-brand-deep/10',
    accentColor: 'text-brand-deep',
  },
  {
    id: 2,
    title: 'Find Your Perfect PG',
    description:
      'Search by city, budget, amenities, and gender preference. Filter results with smart tools and explore detailed listings with photos, reviews, and virtual tours.',
    icon: <Search className="size-10" />,
    gradient: 'from-brand-teal to-brand-lime',
    bgColor: 'bg-brand-teal/10',
    accentColor: 'text-brand-teal',
  },
  {
    id: 3,
    title: 'Book & Pay Securely',
    description:
      'Book your preferred bed in just a few taps. Pay securely with UPI, cards, or net banking. Track your payments and get digital receipts instantly.',
    icon: <CreditCard className="size-10" />,
    gradient: 'from-brand-deep to-brand-sage',
    bgColor: 'bg-brand-sage/10',
    accentColor: 'text-brand-sage',
  },
  {
    id: 4,
    title: 'Join the Community',
    description:
      'Connect with fellow tenants, find roommates, share tips, and discover nearby services. Be part of a thriving PG community in your city!',
    icon: <Users className="size-10" />,
    gradient: 'from-brand-lime to-brand-teal',
    bgColor: 'bg-brand-lime/10',
    accentColor: 'text-brand-lime',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

const illustrationFeatures: Record<number, React.ReactNode> = {
  1: (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {[Home, MapPin, ShieldCheck, Sparkles, Users, CreditCard].map(
        (Icon, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-lg bg-white/80 p-3"
          >
            <Icon className="size-5 text-brand-deep" />
          </div>
        )
      )}
    </div>
  ),
  2: (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2">
        <MapPin className="size-4 text-brand-teal" />
        <span className="text-xs font-medium">Koramangala, Bangalore</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2">
        <span className="text-xs font-medium text-brand-teal">₹5,000 - ₹15,000/mo</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {['WiFi', 'AC', 'Meals', 'Parking'].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-medium text-brand-deep"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  ),
  3: (
    <div className="space-y-2 mt-4">
      {[
        { label: 'UPI Payment', sub: 'Instant & secure' },
        { label: 'Card Payment', sub: 'Visa, Mastercard, Rupay' },
        { label: 'Net Banking', sub: 'All major banks' },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2"
        >
          <ShieldCheck className="size-4 text-brand-sage" />
          <div>
            <p className="text-xs font-medium">{item.label}</p>
            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  ),
  4: (
    <div className="space-y-2 mt-4">
      {[
        { label: 'Roommates', count: '2.8k members' },
        { label: 'Foodies United', count: '3.1k members' },
        { label: 'Tech Hub BLR', count: '1.5k members' },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brand-lime" />
            <span className="text-xs font-medium">{item.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  ),
};

interface TenantOnboardingProps {
  onComplete?: () => void;
}

export default function TenantOnboarding({ onComplete }: TenantOnboardingProps) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_KEY) !== 'true';
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          aria-label="Skip onboarding"
        >
          <X className="size-5" />
        </button>

        {/* Onboarding card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl shadow-gold-md border border-gold/20 overflow-hidden"
        >
          {/* Illustration area */}
          <div
            className={`relative h-56 sm:h-64 bg-gradient-to-br ${step.gradient} p-6 flex flex-col items-center justify-center text-white`}
          >
            {/* Decorative circles */}
            <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-white/10" />

            {/* Icon */}
            <motion.div
              key={step.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="relative z-10 mb-2"
            >
              {step.icon}
            </motion.div>

            {/* Step-specific mockup */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="relative z-10 text-white"
              >
                {illustrationFeatures[step.id]}
              </motion.div>
            </AnimatePresence>

            {/* Step badge */}
            <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
              {currentStep + 1} / {STEPS.length}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-2">{step.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {STEPS.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-brand-deep'
                      : 'w-2 bg-muted-foreground/30'
                  }`}
                  layout
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 gap-3">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="border-gold/20"
                  >
                    Back
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  className={`bg-gradient-to-r ${step.gradient} text-white hover:opacity-90 shadow-gold-sm`}
                >
                  {currentStep === STEPS.length - 1 ? (
                    <>
                      Get Started
                      <Sparkles className="size-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="size-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
