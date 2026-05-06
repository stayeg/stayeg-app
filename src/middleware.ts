/**
 * StayEg Next.js Middleware — Edge-level request protection.
 *
 * This middleware runs at the edge before any API route or page is hit.
 * It provides:
 *  1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 *  2. CORS headers for API responses
 *  3. Rate limiting (IP-based, in-memory — use Redis for production)
 *  4. Blocks setup/seed endpoints in production
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Rate Limiting ──────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

// Per-endpoint rate limits (requests per minute)
const RATE_LIMITS: Record<string, number> = {
  auth: 10,       // /api/auth/*
  contact: 5,     // /api/contact
  aiChat: 20,     // /api/ai-chat
  setup: 3,       // /api/setup/*, /api/seed
  general: 100,   // everything else
};

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

function getRateLimitCategory(path: string): { category: string; limit: number } {
  if (path.startsWith('/api/auth')) return { category: 'auth', limit: RATE_LIMITS.auth };
  if (path.startsWith('/api/contact')) return { category: 'contact', limit: RATE_LIMITS.contact };
  if (path.startsWith('/api/ai-chat')) return { category: 'aiChat', limit: RATE_LIMITS.aiChat };
  if (path.startsWith('/api/setup') || path.startsWith('/api/seed')) return { category: 'setup', limit: RATE_LIMITS.setup };
  return { category: 'general', limit: RATE_LIMITS.general };
}

// ─── Main Middleware ────────────────────────────────────────

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const clientIp = getClientIp(request);
  const path = request.nextUrl.pathname;
  const isProduction = process.env.NODE_ENV === 'production';

  // ── 1. Security Headers (applied to ALL responses) ──

  // Content-Security-Policy — prevents XSS, clickjacking, and data injection
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // unsafe-eval/inline needed for Next.js dev + some libs
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com",
    "connect-src 'self' https://*.supabase.co https://api.razorpay.com https://sentry.io *.ingest.sentry.io",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // Strict-Transport-Security — enforce HTTPS (production only)
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // Standard security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy — restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );

  // ── 2. Block setup/seed endpoints in production ──

  if (isProduction && (path.startsWith('/api/setup') || path.startsWith('/api/seed'))) {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    );
  }

  // ── 3. CORS for API routes ──

  if (path.startsWith('/api/')) {
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'https://stayeg.in',
      'http://localhost:3000',
      'https://localhost:3000',
    ].filter(Boolean);

    const requestOrigin = request.headers.get('origin');

    let corsOrigin: string;
    if (isProduction) {
      // In production: only allow known origins
      corsOrigin = (requestOrigin && allowedOrigins.includes(requestOrigin))
        ? requestOrigin
        : allowedOrigins[0];
    } else {
      // In development: allow any origin
      corsOrigin = requestOrigin || '*';
    }

    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    // NOTE: x-admin-secret removed from CORS headers — admin operations use JWT with admin role
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // ── 4. CORS preflight handling ──

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // ── 5. Rate limiting for API routes ──

  if (path.startsWith('/api/')) {
    const { category, limit } = getRateLimitCategory(path);
    const rateLimitKey = `${category}:${clientIp}`;
    const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, limit);

    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
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
    // Match all API routes AND page routes (for security headers)
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|og-image.png).*)',
  ],
};
