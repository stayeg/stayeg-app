/**
 * GET /api/setup/test-db
 * Tests database connectivity with all possible Supabase connection formats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSecret } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const secretError = requireAdminSecret(request);
  if (secretError) return secretError;

  const SUPABASE_DB_PASSWORD = 'BizMeals@1998';
  const PROJECT_REF = 'rgkbkdxfekslaygvjngm';
  const enc = encodeURIComponent(SUPABASE_DB_PASSWORD);

  const attempts: { name: string; url: string }[] = [
    // Direct connections
    { name: 'Direct db ref (5432)', url: `postgresql://postgres:${enc}@db.${PROJECT_REF}.supabase.co:5432/postgres` },
    { name: 'Direct project host (5432)', url: `postgresql://postgres:${enc}@${PROJECT_REF}.supabase.co:5432/postgres` },
    { name: 'Direct project host pooler (6543)', url: `postgresql://postgres:${enc}@${PROJECT_REF}.supabase.co:6543/postgres` },
    
    // Pooler with postgres.{ref} username - different regions
    { name: 'Pooler ap-south-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler us-east-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler us-west-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-us-west-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler eu-west-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler ap-southeast-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler us-east-2 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-us-east-2.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler sa-east-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler ap-northeast-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler eu-central-1 (6543)', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` },
    
    // Pooler with just postgres username
    { name: 'Pooler ap-south-1 as postgres (6543)', url: `postgresql://postgres:${enc}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler us-east-1 as postgres (6543)', url: `postgresql://postgres:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres` },
    
    // Alternative pooler hostname formats
    { name: 'Pooler without aws-0 prefix ap-south-1', url: `postgresql://postgres.${PROJECT_REF}:${enc}@ap-south-1.pooler.supabase.com:6543/postgres` },
    { name: 'Pooler without aws-0 prefix us-east-1', url: `postgresql://postgres.${PROJECT_REF}:${enc}@us-east-1.pooler.supabase.com:6543/postgres` },
    
    // Port 5432 on pooler
    { name: 'Pooler ap-south-1 port 5432', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` },
    { name: 'Pooler us-east-1 port 5432', url: `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres` },
    
    // Database name variations
    { name: 'Direct db ref (5432) db=postgres', url: `postgresql://postgres:${enc}@db.${PROJECT_REF}.supabase.co:5432/postgres` },
  ];

  const pg = await import('pg');
  const { Client } = pg;
  const results: { name: string; error: string; success: boolean }[] = [];

  for (const attempt of attempts) {
    try {
      const client = new pg.Client({
        connectionString: attempt.url,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 5000,
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      const r = await client.query('SELECT version() as v, current_database() as db');
      await client.end();
      return NextResponse.json({ 
        success: true, 
        message: `CONNECTED via: ${attempt.name}`,
        dbVersion: r.rows[0].v,
        database: r.rows[0].db,
        results: [...results, { name: attempt.name, error: '', success: true }]
      });
    } catch (e: any) {
      results.push({ 
        name: attempt.name, 
        error: e.message?.substring(0, 100) || String(e), 
        success: false 
      });
    }
  }

  return NextResponse.json({
    success: false,
    message: 'All connection methods failed. The password_hash column needs to be added manually via Supabase Dashboard SQL Editor.',
    results,
    manualSqlSteps: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'NOT_SUBMITTED' CHECK (kyc_status IN ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'));`,
    ],
    dashboardUrl: 'https://supabase.com/dashboard/project/rgkbkdxfekslaygvjngm/sql',
  }, { status: 500 });
}
