'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  // Initialize Sentry client-side (only once, after mount)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@/lib/sentry-client').then(({ initSentryClient }) => {
        initSentryClient();
      }).catch(() => {
        // Sentry init failed — don't break the app
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
