'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TooltipGuideProps {
  children: React.ReactNode;
  title: string;
  description: string;
  step?: number;
  totalSteps?: number;
  delay?: number;
  active?: boolean;
}

export default function TooltipGuide({
  children,
  title,
  description,
  step,
  totalSteps,
  delay = 2000,
  active = true,
}: TooltipGuideProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || dismissed) return;

    timerRef.current = setTimeout(() => {
      setOpen(true);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [active, delay, dismissed]);

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
  };

  if (!active || dismissed) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <PopoverTrigger asChild>
        <div className="relative inline-flex">
          {children}
          {/* Pulsing highlight dot */}
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-deep opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-deep" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        className="w-72 p-0 border-gold/30 shadow-gold-md"
      >
        <div className="p-4">
          {/* Step indicator */}
          {step !== undefined && totalSteps !== undefined && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-deep">
                Tip {step} of {totalSteps}
              </span>
            </div>
          )}

          {/* Title */}
          <h4 className="text-sm font-semibold mb-1.5">{title}</h4>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Dismiss button */}
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleDismiss}
              className="h-7 text-xs bg-brand-deep hover:bg-brand-deep/90 text-white"
            >
              <Check className="size-3 mr-1" />
              Got it
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
