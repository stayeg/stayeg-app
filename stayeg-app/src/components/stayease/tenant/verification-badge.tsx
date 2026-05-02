'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scaleIn } from '@/lib/animations';

interface VerificationBadgeProps {
  isVerified: boolean;
  compact?: boolean;
  className?: string;
}

export default function VerificationBadge({
  isVerified,
  compact = false,
  className,
}: VerificationBadgeProps) {
  if (compact) {
    return (
      <motion.span
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className={cn(
          'inline-flex items-center gap-1.5',
          className
        )}
      >
        {isVerified ? (
          <>
            <ShieldCheck className="size-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">
              Verified
            </span>
          </>
        ) : (
          <>
            <Shield className="size-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">
              Unverified
            </span>
          </>
        )}
      </motion.span>
    );
  }

  // Full mode
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className={cn('flex items-center gap-2.5', className)}
    >
      {isVerified ? (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Verified PG
            </p>
            <p className="text-xs text-blue-600/80">
              Physically inspected by StayEg team
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Shield className="size-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">
              Unverified
            </p>
            <p className="text-xs text-gray-400">
              Not yet inspected
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
