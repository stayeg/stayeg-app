'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { shouldAnimate } from '@/lib/animations';

/**
 * A subtle teal glow dot that follows the mouse cursor on desktop.
 * Only visible when hovering over interactive elements (buttons, cards, links).
 * Hidden on mobile via md: breakpoint and respect prefers-reduced-motion.
 */
export default function CursorFollower() {
  const [visible, setVisible] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { stiffness: 250, damping: 20, mass: 0.5 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Use rAF to avoid jank on fast mouse moves
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    });
  }, [cursorX, cursorY]);

  const handleMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const interactive = target.closest(
      'button, a, [role="button"], input, select, textarea, [data-cursor="pointer"], .cursor-pointer'
    );
    if (interactive) {
      setVisible(true);
    }
  }, []);

  const handleMouseOut = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const interactive = target.closest(
      'button, a, [role="button"], input, select, textarea, [data-cursor="pointer"], .cursor-pointer'
    );
    if (interactive) {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    // Don't render on touch devices or if user prefers reduced motion
    if (!shouldAnimate()) return;
    // Check for touch device
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return;
    // Check for fine pointer (mouse/trackpad) vs coarse (touch)
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseout', handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseOver, handleMouseOut]);

  // Also add a matchMedia listener for pointer changes (e.g., connecting/disconnecting mouse)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(pointer: fine)');
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        setVisible(false);
        cursorX.set(-100);
        cursorY.set(-100);
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none hidden md:block"
      style={{ x, y }}
      animate={{
        scale: visible ? 1 : 0,
        opacity: visible ? 1 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      <div
        className="size-5 rounded-full"
        style={{
          background:
            'radial-gradient(circle, var(--brand-teal) 0%, transparent 70%)',
          opacity: 0.35,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </motion.div>
  );
}
