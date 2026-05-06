/**
 * Next.js Instrumentation — StayEg
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize Sentry for server-side monitoring.
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentryServer } = await import('@/lib/sentry-server');
    initSentryServer();
  }
}
