/**
 * StayEg Next.js Middleware — Edge-level request protection.
 *
 * This middleware runs at the edge before any API route or page is hit.
 * It provides:
 *  1. Basic rate limiting hint (X-RateLimit headers) for auth endpoints
 *  2. CORS headers for API responses
 *  3. Blocks direct access to setup endpoints in production
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limit store (per-edge instance)
// For production, use Redis or a proper rate-limiting service
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const AUTH_RATE_LIMIT = 10; // 10 requests per minute for auth endpoints
const GENERAL_RATE_LIMIT = 100; // 100 requests per minute for general endpoints

function checkRateLimit(
  key: string,
  limit: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: limit - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const clientIp = getClientIp(request);
  const path = request.nextUrl.pathname;

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add CORS headers for API routes — restrict to known origins in production
  if (path.startsWith('/api/')) {
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'https://stayeg.in',
      'http://localhost:3000',
      'https://localhost:3000',
    ].filter(Boolean);

    const requestOrigin = request.headers.get('origin');
    const corsOrigin = (process.env.NODE_ENV === 'production')
      ? (requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0])
      : (requestOrigin || '*');

    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // Rate limiting for auth endpoints
  if (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/send-otp') ||
    path.startsWith('/api/auth/verify-otp') ||
    path === '/api/auth' && request.method === 'GET'
  ) {
    const rateLimitKey = `auth:${clientIp}`;
    const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT);

    response.headers.set('X-RateLimit-Limit', String(AUTH_RATE_LIMIT));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: response.headers,
        },
      );
    }
  }

  // General rate limiting for all other API endpoints
  if (path.startsWith('/api/') && !path.startsWith('/api/auth')) {
    const rateLimitKey = `general:${clientIp}`;
    const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, GENERAL_RATE_LIMIT);

    response.headers.set('X-RateLimit-Limit', String(GENERAL_RATE_LIMIT));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        {
          status: 429,
          headers: response.headers,
        },
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
