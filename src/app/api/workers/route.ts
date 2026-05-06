import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can view workers
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const pgId = searchParams.get('pgId');
    const role = searchParams.get('role');

    let query = supabaseAdmin
      .from('workers')
      .select('*')
      .order('role', { ascending: true });

    if (pgId) {
      // SECURITY FIX: When pgId is specified, verify the PG belongs to the owner
      if (authResult.user.role !== 'ADMIN') {
        const { data: pg } = await supabaseAdmin
          .from('pgs')
          .select('owner_id')
          .eq('id', pgId)
          .single();

        if (!pg || pg.owner_id !== authResult.user.id) {
          return NextResponse.json({ error: 'Forbidden: you can only view workers in your own PGs' }, { status: 403 });
        }
      }
      query = query.eq('pg_id', pgId);
    }
    if (role) query = query.eq('role', role);

    const { data: workers, error } = await query;
    if (error) {
      console.error('GET /api/workers error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
    }

    return NextResponse.json(workers || []);
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/workers' });
    console.error('GET /api/workers error:', error);
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can create workers
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();

    // SECURITY FIX: Verify the PG belongs to the owner before creating a worker
    if (authResult.user.role !== 'ADMIN') {
      const pgId = body.pgId;
      if (!pgId) {
        return NextResponse.json({ error: 'pgId is required' }, { status: 400 });
      }
      const { data: pg } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', pgId)
        .single();

      if (!pg || pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden: you can only create workers in your own PGs' }, { status: 403 });
      }
    }

    const { data: worker, error } = await supabaseAdmin
      .from('workers')
      .insert({
        name: body.name,
        role: body.role,
        phone: body.phone,
        pg_id: body.pgId,
        shift: body.shift,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(worker, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/workers' });
    console.error('POST /api/workers error:', error);
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can update workers
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // SECURITY FIX: Verify ownership — owners can only update workers in their own PGs
    if (authResult.user.role !== 'ADMIN') {
      const { data: worker } = await supabaseAdmin
        .from('workers')
        .select('pg_id')
        .eq('id', id)
        .single();

      if (!worker) {
        return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
      }

      const { data: pg } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', worker.pg_id)
        .single();

      if (!pg || pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden: you can only update workers in your own PGs' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.shift !== undefined) updateData.shift = data.shift;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.pgId !== undefined) updateData.pg_id = data.pgId;

    const { data: worker, error } = await supabaseAdmin
      .from('workers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(worker);
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/workers' });
    console.error('PUT /api/workers error:', error);
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 });
  }
}
