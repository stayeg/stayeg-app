/**
 * Input Validation & Sanitization Utilities — StayEg
 *
 * Provides reusable validation and sanitization helpers
 * for all API routes to ensure consistent input handling.
 */

// ─── Sanitization ──────────────────────────────────────────

/**
 * Strip HTML tags and escape special characters to prevent XSS.
 * Applied to all user-submitted text fields before DB storage.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Strip all HTML tags from input (more aggressive sanitization).
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize a string for use in SQL LIKE patterns.
 * Escapes % _ \ wildcards to prevent LIKE injection.
 */
export function sanitizeLikePattern(input: string): string {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/[%_\\]/g, '\\$&');
}

// ─── Validation ─────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/;

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate Indian phone number format.
 * Accepts: 9876543210, +919876543210, +91 9876543210
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate that a value is a positive number (or zero if allowZero is true).
 */
export function isValidPositiveNumber(value: unknown, allowZero = false): boolean {
  const num = Number(value);
  if (isNaN(num)) return false;
  return allowZero ? num >= 0 : num > 0;
}

/**
 * Validate that a string length is within bounds.
 */
export function isValidLength(value: string, min: number, max: number): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
}

/**
 * Validate a URL string.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a date string (ISO 8601).
 */
export function isValidDate(date: string): boolean {
  if (!date || typeof date !== 'string') return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Validate Indian IFSC code format (4 letters + 0 + 6 alphanumeric).
 * Example: SBIN0001234
 */
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export function isValidIFSC(ifsc: string): boolean {
  if (!ifsc || typeof ifsc !== 'string') return false;
  return IFSC_REGEX.test(ifsc.trim().toUpperCase());
}

// ─── Field Validators ───────────────────────────────────────

interface FieldRule {
  field: string;
  label?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'url' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  sanitize?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a set of fields against rules.
 * Returns an array of validation errors (empty if all valid).
 *
 * @example
 * const errors = validateFields(body, [
 *   { field: 'name', required: true, minLength: 2, maxLength: 100, sanitize: true },
 *   { field: 'email', required: true, type: 'email' },
 *   { field: 'phone', type: 'phone' },
 *   { field: 'price', type: 'number', min: 0 },
 * ]);
 */
export function validateFields(
  data: Record<string, unknown>,
  rules: FieldRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    const label = rule.label || rule.field;

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: rule.field, message: `${label} is required` });
      continue;
    }

    // Skip further validation if not required and empty
    if (value === undefined || value === null || value === '') continue;

    // Type checks
    if (rule.type === 'email' && !isValidEmail(String(value))) {
      errors.push({ field: rule.field, message: `${label} must be a valid email address` });
    }

    if (rule.type === 'phone' && !isValidPhone(String(value))) {
      errors.push({ field: rule.field, message: `${label} must be a valid Indian phone number` });
    }

    if (rule.type === 'number') {
      if (typeof value !== 'number' && isNaN(Number(value))) {
        errors.push({ field: rule.field, message: `${label} must be a valid number` });
      } else {
        const num = Number(value);
        if (rule.min !== undefined && num < rule.min) {
          errors.push({ field: rule.field, message: `${label} must be at least ${rule.min}` });
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push({ field: rule.field, message: `${label} must be at most ${rule.max}` });
        }
      }
    }

    if (rule.type === 'url' && !isValidUrl(String(value))) {
      errors.push({ field: rule.field, message: `${label} must be a valid URL` });
    }

    if (rule.type === 'date' && !isValidDate(String(value))) {
      errors.push({ field: rule.field, message: `${label} must be a valid date` });
    }

    // String length checks
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({ field: rule.field, message: `${label} must be at least ${rule.minLength} characters` });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({ field: rule.field, message: `${label} must be at most ${rule.maxLength} characters` });
      }
    }
  }

  return errors;
}

/**
 * Sanitize specified fields in a data object.
 * Returns a new object with sanitized values.
 */
export function sanitizeFields(
  data: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      result[field] = stripHtml(result[field] as string);
    }
  }
  return result;
}
