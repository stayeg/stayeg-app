/**
 * Sentry Server Configuration — StayEg
 *
 * Auto-detected by @sentry/nextjs SDK on the server side.
 * Only activates when NEXT_PUBLIC_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

    // Performance monitoring — sample 10% of server transactions
    tracesSampleRate: 0.1,

    // Ignore common non-critical server errors
    ignoreErrors: [
      'NetworkError',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'prisma-client',
    ],

    // Reduce noise from health checks and static assets
    denyUrls: [
      /\/api\/health/i,
      /\/_next\/static\//i,
      /\/favicon\.ico/i,
    ],
  });
}
