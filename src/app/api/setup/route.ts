import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const REQUIRED_TABLES = [
  'users', 'pgs', 'rooms', 'beds', 'bookings',
  'payments', 'complaints', 'vendors', 'workers',
];

export async function GET() {
  try {
    const existing: string[] = [];
    const missing: string[] = [];
    const tableDetails: { name: string; exists: boolean; count: number }[] = [];

    for (const table of REQUIRED_TABLES) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          missing.push(table);
          tableDetails.push({ name: table, exists: false, count: 0 });
        } else {
          existing.push(table);
          tableDetails.push({ name: table, exists: true, count: count ?? 0 });
        }
      } catch {
        missing.push(table);
        tableDetails.push({ name: table, exists: false, count: 0 });
      }
    }

    const extraTables = ['tenant_notes', 'activity_log', 'reports', 'contact_submissions'];
    for (const table of extraTables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });
        if (!error) {
          existing.push(table);
          tableDetails.push({ name: table, exists: true, count: count ?? 0 });
        }
      } catch {
        // Extra tables are optional
      }
    }

    const isSetup = missing.length === 0;
    const stats: Record<string, number> = {};
    for (const t of tableDetails) {
      if (t.exists) stats[t.name] = t.count;
    }

    return NextResponse.json({
      setup: isSetup,
      connected: true,
      tables: existing,
      missing,
      tableDetails,
      stats: Object.keys(stats).length > 0 ? stats : null,
      message: isSetup
        ? 'All tables are ready!'
        : `Missing ${missing.length} table(s): ${missing.join(', ')}`,
    });
  } catch {
    return NextResponse.json({
      setup: false,
      connected: false,
      tables: [],
      missing: REQUIRED_TABLES,
      message: 'Could not connect to Supabase.',
    }, { status: 500 });
  }
}
