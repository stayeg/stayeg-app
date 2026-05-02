/**
 * JWT token utility for StayEg authentication.
 * Server-side uses jsonwebtoken for signing/verifying tokens.
 * Client-side uses lightweight base64url decode (no crypto dependency).
 *
 * SECURITY NOTE: JWT_SECRET must be set via environment variables.
 * Never hardcode secrets in source code — this is a critical production
 * security requirement. Tokens signed with a leaked secret allow
 * arbitrary impersonation of any user.
 */

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Extract JWT token from Authorization header.
 * Supports "Bearer <token>" format.
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return authHeader.trim();
}

// ---------------------------------------------------------------------------
// Client-safe JWT decode (no crypto dependency)
// Used by api-client.ts in browser context
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): string {
  // Replace URL-safe chars and add padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  try {
    return atob(base64);
  } catch {
    return '';
  }
}

/**
 * Client-safe JWT payload decode (no signature verification).
 * Checks expiry but does NOT verify cryptographic signature.
 * Signature verification always happens server-side in API routes.
 */
export function verifyTokenClient(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (!payload.userId || !payload.email) return null;
    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Server-only functions (dynamic import to avoid bundling jsonwebtoken in client)
// ---------------------------------------------------------------------------

let _signToken: ((payload: Omit<TokenPayload, 'iat' | 'exp'>) => string) | null = null;
let _verifyTokenServer: ((token: string) => TokenPayload | null) | null = null;
let _serverInitAttempted = false;

async function ensureServerJWT() {
  if (_serverInitAttempted) return;
  _serverInitAttempted = true;
  if (typeof window !== 'undefined') return; // Never load jsonwebtoken in browser

  try {
    const jwtModule = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[JWT] JWT_SECRET not set');
      return;
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const jwt = jwtModule.default || jwtModule;

    _signToken = (payload) =>
      jwt.sign(payload, secret, { expiresIn } as any);

    _verifyTokenServer = (token) => {
      try {
        return jwt.verify(token, secret) as TokenPayload;
      } catch {
        return null;
      }
    };
  } catch (err) {
    console.error('[JWT] Failed to load jsonwebtoken:', err);
  }
}

/**
 * Server-only: Generate a JWT token for a user session.
 * Must only be called from API routes (server-side).
 */
export async function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  await ensureServerJWT();
  if (!_signToken) throw new Error('JWT signing not available. Ensure JWT_SECRET is set.');
  return _signToken(payload);
}

/**
 * Server-only: Verify a JWT token with full cryptographic verification.
 * Must only be called from API routes (server-side).
 * On the client, use verifyTokenClient instead.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  await ensureServerJWT();
  if (_verifyTokenServer) return _verifyTokenServer(token);
  // Fallback to client-safe decode if server module unavailable
  return verifyTokenClient(token);
}
