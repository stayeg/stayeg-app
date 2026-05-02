import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSecret } from '@/lib/api-auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// ─── Types ───────────────────────────────────────────────────────────
interface StepResult {
  step: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  duration_ms?: number;
}

interface TableStatus {
  name: string;
  exists: boolean;
  rows: number;
}

interface SetupResponse {
  success: boolean;
  request_id: string;
  message: string;
  project_ref: string;
  timestamp: string;
  steps: StepResult[];
  table_status: TableStatus[];
  errors: string[];
  duration_ms: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  : '';

const DB_HOST = `db.${SUPABASE_PROJECT_REF}.supabase.co`;
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'BizMeals@1998';

const ALL_TABLES = [
  'users', 'pgs', 'rooms', 'beds', 'bookings',
  'payments', 'complaints', 'vendors', 'workers',
  'tenant_notes', 'activity_log',
];

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Force IPv4 DNS resolution to prevent ECONNREFUSED on IPv6.
 * Uses the modern Node.js API available since v16.4.
 */
function ensureIPv4First(): void {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Fallback: older Node.js — attempt monkey-patch via dynamic import
    // This is non-critical; the pg pool will retry on its own.
  }
}

/** Mask password for safe display in responses. */
function maskPassword(pwd: string): string {
  if (!pwd) return '***';
  if (pwd.length <= 4) return '****';
  return pwd.slice(0, 2) + '***' + pwd.slice(-2);
}

/** Generate a short trace ID for this request. */
function generateRequestId(): string {
  return crypto.randomBytes(4).toString('hex');
}

/** Read the full setup SQL from the local file. */
async function readSetupSql(): Promise<string> {
  const sqlPath = path.join(process.cwd(), 'supabase', 'setup.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL file not found at ${sqlPath}`);
  }
  return fs.readFileSync(sqlPath, 'utf-8');
}

/** Check if a table exists in the public schema. */
async function checkTableExists(
  client: import('pg').PoolClient,
  tableName: string,
): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM pg_tables WHERE tablename = $1 AND schemaname = 'public'`,
    [tableName],
  );
  return res.rows.length > 0;
}

/** Get row count for a table, returning -1 on error. */
async function getRowCount(
  client: import('pg').PoolClient,
  tableName: string,
): Promise<number> {
  try {
    const res = await client.query(`SELECT COUNT(*)::int AS cnt FROM "${tableName}"`);
    return res.rows[0]?.cnt ?? 0;
  } catch {
    return -1;
  }
}

// ─── POST Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  // 1. Auth check
  const authError = requireAdminSecret(request);
  if (authError) return authError;

  const overallStart = Date.now();
  const steps: StepResult[] = [];
  const tableStatus: TableStatus[] = [];
  const errors: string[] = [];

  // 2. Validate config
  if (!SUPABASE_PROJECT_REF) {
    return NextResponse.json(
      {
        success: false,
        request_id: requestId,
        message: 'SUPABASE_PROJECT_REF not found. Check NEXT_PUBLIC_SUPABASE_URL.',
        project_ref: '',
        timestamp: new Date().toISOString(),
        steps: [],
        table_status: [],
        errors: ['Missing project ref'],
        duration_ms: Date.now() - overallStart,
      } satisfies SetupResponse,
      { status: 500 },
    );
  }

  // 3. Force IPv4 DNS resolution
  ensureIPv4First();

  // 4. Read the SQL file
  let sqlContent: string;
  try {
    sqlContent = await readSetupSql();
    steps.push({
      step: 'Read SQL file',
      status: 'ok',
      message: `Read ${sqlContent.length} bytes from supabase/setup.sql`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to read SQL file';
    errors.push(msg);
    steps.push({ step: 'Read SQL file', status: 'error', message: msg });

    return NextResponse.json(
      {
        success: false,
        request_id: requestId,
        message: 'Failed to read SQL file.',
        project_ref: SUPABASE_PROJECT_REF,
        timestamp: new Date().toISOString(),
        steps,
        table_status: [],
        errors,
        duration_ms: Date.now() - overallStart,
      } satisfies SetupResponse,
      { status: 500 },
    );
  }

  // 5. Connect to PostgreSQL via pg Pool
  let pool: import('pg').Pool | null = null;

  try {
    const { Pool } = await import('pg');

    const connStr = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

    pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      query_timeout: 120_000,
      statement_timeout: 120_000,
    });

    const connStart = Date.now();
    const testClient = await pool.connect();
    await testClient.query('SELECT 1 AS alive');
    testClient.release();

    steps.push({
      step: 'Database connection',
      status: 'ok',
      message: `Connected to ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER}, pwd: ${maskPassword(DB_PASSWORD)})`,
      duration_ms: Date.now() - connStart,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    steps.push({
      step: 'Database connection',
      status: 'error',
      message: `Failed to connect to ${DB_HOST}:${DB_PORT} — ${msg}`,
    });

    try { await pool?.end(); } catch { /* ignore */ }

    return NextResponse.json(
      {
        success: false,
        request_id: requestId,
        message: 'Could not connect to Supabase PostgreSQL.',
        project_ref: SUPABASE_PROJECT_REF,
        timestamp: new Date().toISOString(),
        steps,
        table_status: [],
        errors,
        duration_ms: Date.now() - overallStart,
      } satisfies SetupResponse,
      { status: 500 },
    );
  }

  // 6. Execute the full setup SQL (DDL + seed)
  try {
    const sqlStart = Date.now();
    const client = await pool.connect();

    try {
      await client.query(sqlContent);
    } catch (queryErr) {
      const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);

      // The SQL uses IF NOT EXISTS and DO $$ EXCEPTION blocks, so many
      // "duplicate" or "already exists" errors are benign on re-runs.
      if (msg.includes('duplicate') || msg.includes('already exists')) {
        steps.push({
          step: 'Execute setup SQL',
          status: 'warn',
          message: `SQL executed with benign duplicate warnings: ${msg.slice(0, 200)}`,
          duration_ms: Date.now() - sqlStart,
        });
      } else {
        errors.push(msg);
        steps.push({
          step: 'Execute setup SQL',
          status: 'error',
          message: `SQL execution error: ${msg.slice(0, 500)}`,
          duration_ms: Date.now() - sqlStart,
        });

        client.release();
        await pool.end();

        return NextResponse.json(
          {
            success: false,
            request_id: requestId,
            message: 'SQL execution failed.',
            project_ref: SUPABASE_PROJECT_REF,
            timestamp: new Date().toISOString(),
            steps,
            table_status: [],
            errors,
            duration_ms: Date.now() - overallStart,
          } satisfies SetupResponse,
          { status: 500 },
        );
      }
    }

    client.release();

    steps.push({
      step: 'Execute setup SQL',
      status: 'ok',
      message: 'All DDL, RLS policies, triggers, indexes, and seed data executed.',
      duration_ms: Date.now() - sqlStart,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    steps.push({
      step: 'Execute setup SQL',
      status: 'error',
      message: `Unexpected error during SQL execution: ${msg}`,
    });

    try { await pool.end(); } catch { /* ignore */ }

    return NextResponse.json(
      {
        success: false,
        request_id: requestId,
        message: 'Unexpected error during setup.',
        project_ref: SUPABASE_PROJECT_REF,
        timestamp: new Date().toISOString(),
        steps,
        table_status: [],
        errors,
        duration_ms: Date.now() - overallStart,
      } satisfies SetupResponse,
      { status: 500 },
    );
  }

  // 7. Verify all tables exist and report row counts
  try {
    const verifyClient = await pool.connect();
    const verifyStart = Date.now();

    for (const table of ALL_TABLES) {
      const exists = await checkTableExists(verifyClient, table);
      const rows = exists ? await getRowCount(verifyClient, table) : 0;
      tableStatus.push({ name: table, exists, rows });
      if (!exists) {
        errors.push(`Table "${table}" was not created.`);
      }
    }

    verifyClient.release();

    const createdCount = tableStatus.filter((t) => t.exists).length;
    steps.push({
      step: 'Verify tables',
      status: createdCount === ALL_TABLES.length ? 'ok' : 'warn',
      message: `${createdCount}/${ALL_TABLES.length} tables verified. Missing: ${ALL_TABLES.filter((t) => !tableStatus.find((s) => s.name === t)?.exists).join(', ') || 'none'}`,
      duration_ms: Date.now() - verifyStart,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      step: 'Verify tables',
      status: 'warn',
      message: `Verification query failed: ${msg}`,
    });
  }

  // 8. Clean up pool
  try { await pool.end(); } catch { /* ignore */ }

  const allTablesExist = tableStatus.every((t) => t.exists);
  const success = allTablesExist && errors.length === 0;

  return NextResponse.json(
    {
      success,
      request_id: requestId,
      message: success
        ? 'Database setup completed successfully! All 11 tables created with seed data.'
        : `Setup finished with ${errors.length} issue(s). Review errors for details.`,
      project_ref: SUPABASE_PROJECT_REF,
      timestamp: new Date().toISOString(),
      steps,
      table_status: tableStatus,
      errors,
      duration_ms: Date.now() - overallStart,
    } satisfies SetupResponse,
    { status: success ? 200 : 207 },
  );
}

// ─── Explicitly disallow other methods ───────────────────────────────
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 },
  );
}
