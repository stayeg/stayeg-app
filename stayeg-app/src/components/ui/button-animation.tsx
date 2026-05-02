'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

// ==============================
// AnimatedButton
// ==============================
import React from 'react';
import { Button, type buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps
  extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
}

function AnimatedButton({ children, className, onClick, ...props }: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number; size: number }[]
  >([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // Create ripple effect
      const button = buttonRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y, size }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }

      onClick?.(e);
    },
    [onClick]
  );

  return (
    <motion.div whileTap={{ scale: 0.97 }} className="inline-flex">
      <Button
        ref={buttonRef}
        className={cn('relative overflow-hidden', className)}
        onClick={handleClick}
        {...props}
      >
        {children}
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              initial={{ scale: 0, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute rounded-full bg-white/30 pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: ripple.size,
                height: ripple.size,
              }}
            />
          ))}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}

// ==============================
// SuccessAnimation
// ==============================
interface SuccessAnimationProps {
  show: boolean;
  duration?: number;
  onComplete?: () => void;
}

function SuccessAnimation({
  show,
  duration = 3000,
  onComplete,
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show, duration, onComplete]);

  // Confetti particles config
  const particles = [
    { angle: 0, color: 'var(--brand-deep)' },
    { angle: 45, color: 'var(--brand-teal)' },
    { angle: 90, color: 'var(--brand-sage)' },
    { angle: 135, color: 'var(--brand-lime)' },
    { angle: 180, color: 'var(--brand-deep)' },
    { angle: 225, color: 'var(--brand-teal)' },
    { angle: 270, color: 'var(--brand-sage)' },
    { angle: 315, color: 'var(--brand-lime)' },
    { angle: 22.5, color: 'var(--gold)' },
    { angle: 67.5, color: 'var(--gold)' },
    { angle: 112.5, color: 'var(--gold)' },
    { angle: 157.5, color: 'var(--gold)' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="relative flex flex-col items-center justify-center"
          >
            {/* Confetti particles */}
            {particles.map((p, i) => (
              <motion.div
                key={i}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{
                  x:
                    Math.cos((p.angle * Math.PI) / 180) *
                    (50 + Math.random() * 30),
                  y:
                    Math.sin((p.angle * Math.PI) / 180) *
                    (50 + Math.random() * 30) -
                    20,
                  scale: [0, 1.5, 1, 0],
                  opacity: [0, 1, 1, 0],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  delay: 0.3 + i * 0.03,
                  duration: 1.2,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  backgroundColor: p.color,
                  width: 6 + Math.random() * 6,
                  height: 6 + Math.random() * 6,
                }}
              />
            ))}

            {/* Main circle with checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                damping: 10,
                stiffness: 200,
                delay: 0.1,
              }}
              className="relative size-24 sm:size-28 rounded-full bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center shadow-2xl shadow-gold-md"
            >
              {/* Inner ring */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', damping: 10 }}
                className="absolute inset-2 rounded-full border-2 border-white/30"
              />

              {/* Checkmark */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 10 }}
              >
                <Check className="size-12 sm:size-14 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>

            {/* Glow effect */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                delay: 0.2,
                duration: 1.5,
                ease: 'easeOut',
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-24 sm:size-28 rounded-full bg-brand-deep/30 dark:bg-brand-teal/30 blur-xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { AnimatedButton, SuccessAnimation };
