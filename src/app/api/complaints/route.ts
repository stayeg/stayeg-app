import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireSessionWithRole } from '@/lib/api-auth';
import { captureException } from '@/lib/sentry-server';
import { getPaginationParams, applyPaginationRange, createPaginatedResponse } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    // Auth guard: verify user session before fetching complaints
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const pgId = searchParams.get('pgId');
    const status = searchParams.get('status');

    // TENANT can only view their own complaints
    if (authResult.user.role === 'TENANT') {
      userId = authResult.user.id;
    }

    let query = supabaseAdmin
      .from('complaints')
      .select('*, pg:pgs(id,name), user:users(id,name,email,phone,avatar)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (pgId) query = query.eq('pg_id', pgId);
    if (status) query = query.eq('status', status);

    // Apply pagination
    const pagination = getPaginationParams(request);
    const { from, to } = applyPaginationRange(pagination);
    query = query.range(from, to);

    const { data: complaints, count, error } = await query;
    if (error) {
      console.error('Error fetching complaints:', error.message);
      return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
    }

    return NextResponse.json(createPaginatedResponse(complaints || [], count || 0, pagination));
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/complaints' });
    console.error('Error fetching complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: verify user session before creating complaint
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, pgId, title, description, category, priority } = body;

    // TENANT can only file complaints as themselves
    const complaintUserId = authResult.user.role === 'TENANT' ? authResult.user.id : userId;

    if (!complaintUserId || !pgId || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields (userId, pgId, title, description)' }, { status: 400 });
    }

    const { data: complaint, error } = await supabaseAdmin
      .from('complaints')
      .insert({
        user_id: complaintUserId,
        pg_id: pgId,
        title,
        description,
        category: category || 'GENERAL',
        priority: priority || 'MEDIUM',
      })
      .select('*, pg:pgs(name)')
      .single();

    if (error) throw error;
    return NextResponse.json(complaint, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/complaints' });
    console.error('Error creating complaint:', error);
    return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can update (resolve) complaints
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, status, assignedTo, resolution } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
    if (resolution !== undefined) updateData.resolution = resolution;

    const { data: complaint, error } = await supabaseAdmin
      .from('complaints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(complaint);
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/complaints' });
    console.error('Error updating complaint:', error);
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
}
