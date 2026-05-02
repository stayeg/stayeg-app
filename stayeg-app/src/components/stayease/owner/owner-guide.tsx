'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, BedDouble, CreditCard, IndianRupee,
  MessageSquare, CheckCircle2, ChevronLeft, ChevronRight, X,
  Sparkles, Users, BarChart3, Wrench, Star, ArrowRight,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface OwnerGuideProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Building2,
    title: 'Welcome to StayEg!',
    highlight: 'Your PG Management Hub',
    description: 'Manage your entire PG business from one powerful dashboard. Track occupancy, collect rent, handle complaints, and grow your business — all from your phone.',
    gradient: 'from-brand-deep to-brand-teal',
    tip: 'Join 10,000+ PG owners who trust StayEg',
  },
  {
    icon: Building2,
    title: 'List Your PG Property',
    highlight: 'Get Verified, Get Occupied',
    description: 'Add your PG with photos, amenities, room types, and pricing. Verified listings get 3x more bookings! Our team personally inspects every property.',
    gradient: 'from-brand-teal to-brand-sage',
    tip: 'Verified PGs see 40% higher occupancy rates',
  },
  {
    icon: BedDouble,
    title: 'Manage Rooms & Beds',
    highlight: 'Real-Time Occupancy Tracking',
    description: 'Organize rooms by type — Single, Double, Triple, or Dormitory. Track every bed status: Available, Occupied, Maintenance, or Reserved. Know your occupancy at a glance.',
    gradient: 'from-brand-sage to-brand-deep',
    tip: 'Set custom pricing per bed or per room type',
  },
  {
    icon: IndianRupee,
    title: 'Collect Rent Effortlessly',
    highlight: 'Auto Reminders & Digital Payments',
    description: 'Send automatic rent reminders before due dates. Accept UPI, Card, Net Banking, or Cash. Get detailed monthly reports and never miss a payment again.',
    gradient: 'from-brand-deep to-brand-teal',
    tip: 'Average PG owner saves 5 hours/week on rent collection',
  },
  {
    icon: MessageSquare,
    title: 'Handle Complaints Fast',
    highlight: 'Real-Time Ticket System',
    description: 'Tenants report issues instantly. Set priority levels — Low, Medium, High, or Urgent. Assign vendors automatically. Track resolution time and keep everyone happy.',
    gradient: 'from-brand-teal to-brand-sage',
    tip: 'Resolve complaints 60% faster with StayEg',
  },
  {
    icon: CheckCircle2,
    title: 'You\'re All Set!',
    highlight: 'Your PG Empire Starts Here',
    description: 'Everything is ready. Start managing your PGs like a pro! Explore your dashboard, add your first property, and watch your business grow with StayEg.',
    gradient: 'from-brand-sage to-brand-teal',
    tip: 'First 1000 PG Owners get 1 year absolutely FREE!',
  },
];

function StepIcon({ icon: Icon, step }: { icon: React.ElementType; step: number }) {
  const variants = {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    exit: { scale: 0, rotate: 180 },
  };
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
      className="relative"
    >
      <div className={`size-24 md:size-28 rounded-3xl bg-gradient-to-br ${STEPS[step].gradient} flex items-center justify-center shadow-2xl relative overflow-hidden`}>
        {/* Shimmer effect */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />
        <Icon className="size-12 md:size-14 text-white relative z-10" />
        {/* Step number */}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-md">
          <span className="text-sm font-bold text-brand-deep">{step + 1}</span>
        </div>
      </div>
    </motion.div>
  );
}

function FloatingShape({ delay = 0 }: { delay?: number }) {
  const [randomValues] = useState(() => ({
    width: 60 + Math.random() * 80,
    height: 60 + Math.random() * 80,
    top: 10 + Math.random() * 60,
    left: Math.random() * 80,
  }));

  return (
    <motion.div
      animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 5, repeat: Infinity, delay, ease: 'easeInOut' }}
      className="absolute rounded-full opacity-20"
      style={{
        width: randomValues.width,
        height: randomValues.height,
        background: `linear-gradient(135deg, var(--color-brand-deep), var(--color-brand-teal))`,
        top: `${randomValues.top}%`,
        left: `${randomValues.left}%`,
      }}
    />
  );
}

export default function OwnerGuide({ open, onClose }: OwnerGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const totalSteps = STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const goNext = useCallback(() => {
    if (isLastStep) {
      onClose();
      return;
    }
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  }, [isLastStep, onClose]);

  const goBack = useCallback(() => {
    if (currentStep === 0) return;
    setDirection(-1);
    setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  const step = STEPS[currentStep];
  const StepIconComponent = step.icon;

  const handleOpenChange = (v: boolean) => {
    if (!v) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-0 bg-background">
        <DialogTitle className="sr-only">PG Owner Setup Guide</DialogTitle>

        <div className="relative min-h-[420px] md:min-h-[480px] flex flex-col">
          {/* Background floating shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <FloatingShape delay={0} />
            <FloatingShape delay={1.5} />
            <FloatingShape delay={3} />
          </div>

          {/* Close button */}
          <div className="relative z-10 flex justify-between items-center px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-deep to-brand-teal rounded-lg flex items-center justify-center">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="relative z-10 px-5 pb-4">
            <Progress value={progress} className="h-1.5 bg-muted" />
          </div>

          {/* Step content */}
          <div className="relative z-10 flex-1 px-5 pb-4 flex flex-col items-center overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full flex flex-col items-center text-center py-4"
              >
                {/* Animated icon */}
                <StepIcon icon={StepIconComponent} step={currentStep} />

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold text-foreground mt-6 mb-1"
                >
                  {step.title}
                </motion.h2>

                {/* Highlight subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-base font-semibold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent mb-4`}
                >
                  {step.highlight}
                </motion.p>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm"
                >
                  {step.description}
                </motion.p>

                {/* Tip badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="mt-5"
                >
                  <Badge variant="secondary" className="bg-brand-deep/10 text-brand-deep border-brand-deep/20 px-3 py-1.5 text-xs font-medium">
                    <Star className="size-3 mr-1.5 fill-brand-deep text-brand-deep" />
                    {step.tip}
                  </Badge>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="relative z-10 flex justify-center gap-2 pb-3">
            {STEPS.map((_, idx) => (
              <motion.button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentStep ? 1 : -1);
                  setCurrentStep(idx);
                }}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8 h-2.5 bg-gradient-to-r from-brand-deep to-brand-teal'
                    : 'w-2.5 h-2.5 bg-muted hover:bg-muted-foreground/30'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="relative z-10 px-5 pb-5 pt-2 flex items-center justify-between gap-3">
            <div>
              {currentStep > 0 ? (
                <Button variant="ghost" size="sm" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="size-4 mr-1" />
                  Back
                </Button>
              ) : (
                <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5">
                  Skip Tour
                </button>
              )}
            </div>

            <Button
              onClick={goNext}
              className={`bg-gradient-to-r ${isLastStep ? 'from-green-600 to-green-500' : step.gradient} hover:opacity-90 text-white rounded-xl px-6 font-semibold shadow-lg transition-all hover:shadow-xl`}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
