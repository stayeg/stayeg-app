import type { Variants } from 'framer-motion';

// ---------------------------------------------------------------------------
// Reduced-motion guard
// ---------------------------------------------------------------------------
let _prefersReducedMotion: boolean | null = null;

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (_prefersReducedMotion !== null) return _prefersReducedMotion;
  _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return _prefersReducedMotion;
}

/**
 * Returns a duration that is 0 when the user prefers reduced motion,
 * otherwise returns the provided duration.
 */
export function safeDuration(duration: number): number {
  return getPrefersReducedMotion() ? 0 : duration;
}

/**
 * Hook-friendly check (can also be called imperatively).
 * Components should gate visual animations behind this check.
 */
export function shouldAnimate(): boolean {
  return !getPrefersReducedMotion();
}

// ---------------------------------------------------------------------------
// Shared spring configs
// ---------------------------------------------------------------------------
export const springSnappy = { type: 'spring' as const, stiffness: 500, damping: 30 };
export const springGentle = { type: 'spring' as const, stiffness: 300, damping: 24 };
export const springBouncy = { type: 'spring' as const, stiffness: 400, damping: 17 };

// ---------------------------------------------------------------------------
// Variant: Fade In
// ---------------------------------------------------------------------------
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: safeDuration(0.5), ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: safeDuration(0.25) } },
};

// ---------------------------------------------------------------------------
// Variant: Slide Up
// ---------------------------------------------------------------------------
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: safeDuration(0.45), ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, y: -12, transition: { duration: safeDuration(0.2) } },
};

// ---------------------------------------------------------------------------
// Variant: Slide In Left
// ---------------------------------------------------------------------------
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: safeDuration(0.5), ease: 'easeOut' },
  },
  exit: { opacity: 0, x: 16, transition: { duration: safeDuration(0.2) } },
};

// ---------------------------------------------------------------------------
// Variant: Scale In
// ---------------------------------------------------------------------------
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: safeDuration(0.4), ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: safeDuration(0.2) } },
};

// ---------------------------------------------------------------------------
// Stagger Container + Item
// ---------------------------------------------------------------------------
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: safeDuration(0.35), ease: 'easeOut' },
  },
};

// ---------------------------------------------------------------------------
// Page Transitions (for AnimatePresence around route-like views)
// ---------------------------------------------------------------------------
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: safeDuration(0.3), ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.995,
    transition: { duration: safeDuration(0.2) },
  },
};

// ---------------------------------------------------------------------------
// Hover & Tap presets (spread onto motion elements via `whileHover`/`whileTap`)
// ---------------------------------------------------------------------------
export const hoverLift = { y: -4, transition: springGentle };
export const hoverScale = { scale: 1.03, transition: springGentle };
export const tapScale = { scale: 0.97, transition: springSnappy };
export const tapBounce = { scale: 0.92, transition: springBouncy };

// ---------------------------------------------------------------------------
// Shimmer / shine effect keyframes (use with `animate` on a pseudo-element overlay)
// ---------------------------------------------------------------------------
export const shimmer: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: { duration: 0.7, ease: 'easeInOut' },
  },
};

// ---------------------------------------------------------------------------
// Loading shimmer (subtle pulse for skeleton / content transitions)
// ---------------------------------------------------------------------------
export const loadingShimmer: Variants = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: safeDuration(1.5),
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ---------------------------------------------------------------------------
// Footer gradient animation
// ---------------------------------------------------------------------------
export const gradientShift: Variants = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: safeDuration(8),
      repeat: Infinity,
      ease: 'linear',
    },
  },
};
