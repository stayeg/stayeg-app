/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and uptime checks.
 * Returns system status, database connectivity, and version info.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    const dbStatus = dbError ? 'degraded' : 'healthy';
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: dbStatus,
      timestamp: new Date().toISOString(),
      version: '1.2.0',
      services: {
        database: dbError ? 'error' : 'connected',
      },
      responseTime: `${responseTime}ms`,
    }, {
      status: dbStatus === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.2.0',
      services: {
        database: 'error',
      },
      responseTime: `${Date.now() - startTime}ms`,
    }, { status: 503 });
  }
}
