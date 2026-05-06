/**
 * Sentry Edge Runtime Configuration — StayEg
 *
 * Auto-detected by @sentry/nextjs SDK for edge runtime (middleware).
 * Only activates when NEXT_PUBLIC_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'NetworkError',
      'Failed to fetch',
      'AbortError',
    ],
  });
}
