import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    if (error) {
      const msg = String(error.message ?? '');
      const isMissing = msg.includes('does not exist') || msg.includes('not find') || msg.includes('PGRST205');
      return NextResponse.json({
        status: 'ok',
        version: '1.2.0',
        database: isMissing ? 'not_ready' : 'error',
        message: isMissing ? 'Database tables not yet created. Please run setup.' : 'Database connection issue',
      });
    }
    return NextResponse.json({ status: 'ok', version: '1.2.0', database: 'connected' });
  } catch {
    return NextResponse.json({ status: 'ok', version: '1.2.0', database: 'not_ready' });
  }
}
