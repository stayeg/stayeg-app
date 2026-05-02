/**
 * Authenticated API client for the StayEg frontend — v2.
 * 
 * Supports JWT Bearer token authentication (preferred)
 * and falls back to x-user-email header for backward compatibility.
 * 
 * Reads the JWT token from the Zustand persisted store (localStorage)
 * and automatically attaches it as the Authorization header.
 */

import { verifyTokenClient, extractToken } from '@/lib/jwt';

const STORAGE_KEY = 'stayeg-auth-storage';

interface PersistedAuthState {
  state?: {
    currentUser?: {
      email?: string;
    };
    token?: string;
  };
  token?: string;
}

function getPersistedAuth(): { email: string | null; token: string | null } {
  if (typeof window === 'undefined') return { email: null, token: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { email: null, token: null };
    const parsed: PersistedAuthState = JSON.parse(raw);

    // First try to get the stored JWT token
    const token = parsed?.token || parsed?.state?.token || null;

    // Validate the token is still valid (client-safe decode, no crypto)
    if (token) {
      const payload = verifyTokenClient(token);
      if (payload) {
        return { email: payload.email, token };
      }
      // Token expired or invalid — clear it
    }

    // Legacy fallback: use email
    const email = parsed?.state?.currentUser?.email || null;
    return { email, token: null };
  } catch {
    return { email: null, token: null };
  }
}

/**
 * Save a JWT token to localStorage for persistence across page loads.
 */
export function saveAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    // Store token at root level for easy access
    const updated = { ...existing, token };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail — auth will fall back to email header
  }
}

/**
 * Clear the stored JWT token on logout.
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw);
      delete existing.token;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {
    // Silently fail
  }
}

/**
 * Wrapper around `fetch` that injects authentication headers:
 * - Authorization: Bearer <jwt> (if token available)
 * - x-user-email: <email> (legacy fallback)
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const { email, token } = getPersistedAuth();

  // Prefer JWT Bearer token
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  // Legacy fallback: email header (for backward compat during migration)
  if (email && !headers.has('x-user-email')) {
    headers.set('x-user-email', email);
  }

  return fetch(input, { ...init, headers });
}
