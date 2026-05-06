import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { stripHtml } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { reporterId, targetId, targetType, reason, description, contactEmail } = body;

    if (!reporterId || !targetId || !targetType || !reason || !description) {
      return NextResponse.json(
        { error: 'reporterId, targetId, targetType, reason, and description are required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('reports').insert({
      reporter_id: reporterId,
      target_id: targetId,
      target_type: stripHtml(String(targetType).trim()).slice(0, 50),
      reason: stripHtml(String(reason).trim()).slice(0, 200),
      description: stripHtml(String(description).trim()).slice(0, 2000),
      contact_email: contactEmail || null,
      status: 'PENDING',
    });

    if (error) {
      console.error('Error submitting report:', error.message);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Report submitted' }, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/reports' });
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
