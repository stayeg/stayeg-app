/**
 * Next.js Instrumentation — StayEg
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize Sentry for server-side and edge monitoring.
 *
 * The root-level sentry.server.config.ts / sentry.edge.config.ts
 * files are auto-detected by the SDK, so this file provides
 * additional setup (breadcrumbs, user context, etc.).
 */

export async function register() {
  // Server-side initialization
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentryServer } = await import('@/lib/sentry-server');
    initSentryServer();
  }

  // Edge runtime initialization
  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
      });
    }
  }
}
