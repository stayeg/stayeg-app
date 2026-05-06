/**
 * Sentry Server Configuration — StayEg
 *
 * Initializes Sentry for server-side error tracking.
 * Only activates when NEXT_PUBLIC_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/nextjs';

export function initSentryServer() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'NetworkError',
      'prisma-client',
    ],
  });
}

/**
 * Capture an exception in Sentry (if configured).
 * Safe to call even if Sentry is not initialized.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch {
    // Silently fail — Sentry should never break the app
  }
}

/**
 * Add a breadcrumb to Sentry for tracing.
 */
export function addBreadcrumb(breadcrumb: { category: string; message: string; level?: string }) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: (breadcrumb.level as Sentry.SeverityLevel) || 'info',
    });
  } catch {
    // Silently fail
  }
}
