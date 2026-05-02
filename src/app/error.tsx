'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <AlertTriangle className="size-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        An unexpected error occurred. Please try again or go back to the homepage.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-deep to-brand-teal text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="size-4" />
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
