/**
 * API route auth middleware — StayEg v2 (JWT-based + role enforcement).
 *
 * Authentication is via JWT Bearer token only:
 *   Authorization: Bearer <token>
 *
 * SECURITY NOTE: The legacy x-user-email header and atob-based helpers
 * have been removed. All API routes must use JWT tokens issued by the
 * server. The ADMIN_SECRET is also required via environment variables —
 * no hardcoded fallbacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken, extractToken, type TokenPayload } from '@/lib/jwt';

// ============================
// Types
// ============================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  is_verified?: boolean;
  is_approved?: boolean;
  name?: string;
}

export type AuthResult =
  | { error: NextResponse }
  | { user: AuthenticatedUser };

// ============================
// Admin secret validation
// ============================

/** Validate admin secret from x-admin-secret header */
export function requireAdminSecret(request: NextRequest): NextResponse | null {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) {
    // Fail closed: if the env var is missing, no admin operation is allowed.
    console.error('ADMIN_SECRET environment variable is not set. Admin endpoints are disabled.');
    return NextResponse.json(
      { error: 'Server misconfigured: admin authentication is unavailable' },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get('x-admin-secret');
  if (!providedSecret || providedSecret !== ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid or missing admin secret' },
      { status: 401 }
    );
  }
  return null;
}

// ============================
// JWT-based auth (v2 — primary)
// ============================

/**
 * Authenticate a request using JWT Bearer token.
 *
 * Returns the authenticated user or an error response.
 */
export async function requireSession(
  request: NextRequest
): Promise<AuthResult> {
  // --- JWT Bearer token ---
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);

  if (token) {
    const payload: TokenPayload | null = await verifyToken(token);
    if (payload) {
      // Fetch latest user data from DB to get is_approved, is_verified etc.
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, is_verified, is_approved, name')
        .eq('id', payload.userId)
        .limit(1)
        .single();

      if (!error && user) {
        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            is_verified: user.is_verified,
            is_approved: user.is_approved,
            name: user.name,
          },
        };
      }
    }
  }

  return {
    error: NextResponse.json(
      { error: 'Authentication required: provide a valid Bearer token' },
      { status: 401 }
    ),
  };
}

/**
 * Authenticate + enforce role check.
 * Returns error if user doesn't have one of the allowed roles.
 */
export async function requireSessionWithRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult> {
  const result = await requireSession(request);

  if ('error' in result) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return {
      error: NextResponse.json(
        { error: `Forbidden: requires ${allowedRoles.join(' or ')} role` },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Authenticate + ensure user owns the requested resource.
 * Checks that the authenticated user's ID matches the provided ownerId.
 */
export async function requireResourceOwner(
  request: NextRequest,
  ownerId: string
): Promise<AuthResult> {
  const result = await requireSession(request);

  if ('error' in result) return result;

  // Admin can access any resource
  if (result.user.role === 'ADMIN') return result;

  if (result.user.id !== ownerId) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: you do not own this resource' },
        { status: 403 }
      ),
    };
  }

  return result;
}
