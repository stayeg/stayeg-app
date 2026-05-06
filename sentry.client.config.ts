/**
 * Sentry Client Configuration — StayEg
 *
 * Auto-detected by @sentry/nextjs SDK on the client side.
 * Only activates when NEXT_PUBLIC_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring — sample 10% of transactions
    tracesSampleRate: 0.1,

    // Session Replay — 1% of normal sessions, 100% of error sessions
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Ignore common non-critical browser errors
    ignoreErrors: [
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'AbortError',
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'cancelled',
      'Cancel',
      'CLS',
      'Hydration mismatch',
    ],

    // Don't send errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],
  });
}
