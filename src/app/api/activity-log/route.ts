import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireSessionWithRole } from '@/lib/api-auth';

// GET /api/activity-log?ownerId=xxx
export async function GET(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can view activity logs
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json(
        { error: 'ownerId query parameter is required' },
        { status: 400 }
      );
    }

    // OWNER can only view their own activity logs; ADMIN can view any
    if (authResult.user.role === 'OWNER' && ownerId !== authResult.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: can only view your own activity logs' },
        { status: 403 }
      );
    }

    const { data: logs, error } = await supabaseAdmin
      .from('activity_log')
      .select('id, action, details, entity_type, entity_id, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activity logs:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(logs || []);
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/activity-log' });
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

// POST /api/activity-log — Create a new activity log entry
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { ownerId, action, details, entityType, entityId } = body;

    if (!ownerId || !action) {
      return NextResponse.json(
        { error: 'ownerId and action are required' },
        { status: 400 }
      );
    }

    const { data: log, error } = await supabaseAdmin
      .from('activity_log')
      .insert({
        owner_id: ownerId,
        action,
        details: details ?? null,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity log:', error.message);
      return NextResponse.json(
        { error: 'Failed to create activity log' },
        { status: 500 }
      );
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/activity-log' });
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}
