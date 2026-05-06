/**
 * API Route Handler Wrapper — StayEg
 *
 * Wraps Next.js API route handlers with:
 * - Sentry error reporting (captureException)
 * - Consistent error response format
 * - Request logging/breadcrumbs
 *
 * Usage:
 *   export const GET = withApiHandler(async (req, ctx) => { ... });
 *   export const POST = withApiHandler(async (req, ctx) => { ... });
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureException, addBreadcrumb } from '@/lib/sentry-server';

type HandlerContext = { params: Promise<Record<string, string>> };
type ApiHandler = (req: NextRequest, ctx: HandlerContext) => Promise<NextResponse>;

interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Create a standardised JSON error response.
 */
function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(code && { code }),
    },
    { status }
  );
}

/**
 * Wrap an API route handler with error tracking and consistent responses.
 */
export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ctx: HandlerContext) => {
    const startTime = Date.now();
    const { pathname } = req.nextUrl;
    const method = req.method;

    // Add Sentry breadcrumb for request tracing
    addBreadcrumb({
      category: 'api',
      message: `${method} ${pathname}`,
      level: 'info',
    });

    try {
      const result = await handler(req, ctx);

      // Log slow requests (>5s) as warnings
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        addBreadcrumb({
          category: 'api.slow',
          message: `${method} ${pathname} took ${duration}ms`,
          level: 'warning',
        });
      }

      return result;
    } catch (err: unknown) {
      const error = err as ApiError;

      // Determine status code
      const status = error.status || 500;
      const message = status === 500
        ? 'Internal server error'
        : error.message || 'Request failed';

      // Report 5xx errors to Sentry
      if (status >= 500) {
        captureException(error, {
          endpoint: pathname,
          method,
          status,
        });
      }

      // Always log to console for development
      console.error(`[API Error] ${method} ${pathname}:`, error.message || error);

      return errorResponse(message, status, error.code);
    }
  };
}

/**
 * Validate required fields in a request body.
 * Returns an error response if validation fails, or null if OK.
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  const missing = fields.filter(f => !body[f] && body[f] !== 0);
  if (missing.length > 0) {
    return errorResponse(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return null;
}

/**
 * Parse request body as JSON with error handling.
 */
export async function parseBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}
