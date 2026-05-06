/**
 * Sentry Client Configuration — StayEg
 *
 * Initializes Sentry for client-side error tracking.
 * Only activates when NEXT_PUBLIC_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/nextjs';

export function initSentryClient() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    // Sentry not configured — skip initialization
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Performance monitoring sample rate (10% of transactions)
    tracesSampleRate: 0.1,
    // Session replay sample rate (1% of sessions)
    replaysSessionSampleRate: 0.01,
    // Error session replay sample rate (100% of sessions with errors)
    replaysOnErrorSampleRate: 1.0,
    // Ignore common non-critical errors
    ignoreErrors: [
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'AbortError',
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
    ],
  });
}
