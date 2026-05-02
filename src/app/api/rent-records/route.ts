import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

// GET /api/rent-records?tenantId=...&pgId=...&ownerId=...&month=...&status=...
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');
    const pgId = searchParams.get('pgId');
    const ownerId = searchParams.get('ownerId');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    // TENANT can only view their own rent records
    if (authResult.user.role === 'TENANT') {
      tenantId = authResult.user.id;
    }

    if (!tenantId && !pgId && !ownerId) {
      return NextResponse.json({ error: 'tenantId, pgId, or ownerId required' }, { status: 400 });
    }

    // Rent records are tracked via the payments table (type='RENT')
    let query = supabaseAdmin
      .from('payments')
      .select('*, user:users(id,name,phone), pg:pgs(id,name)')
      .eq('type', 'RENT')
      .order('created_at', { ascending: false });

    if (tenantId) query = query.eq('user_id', tenantId);
    if (pgId) query = query.eq('pg_id', pgId);
    if (status) query = query.eq('status', status);

    // If ownerId, filter by PGs owned by this owner
    if (ownerId && !tenantId && !pgId) {
      const { data: pgs } = await supabaseAdmin
        .from('pgs')
        .select('id')
        .eq('owner_id', ownerId);
      const pgIds = (pgs ?? []).map((p: { id: string }) => p.id);
      if (pgIds.length > 0) {
        query = query.in('pg_id', pgIds);
      } else {
        return NextResponse.json([]);
      }
    }

    // Month filter: filter by created_at prefix (YYYY-MM)
    // Since payments don't have a month column, use created_at
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const nextMonth = mon === 12 ? new Date(year + 1, 0, 1) : new Date(year, mon, 1);
      query = query.gte('created_at', `${month}-01T00:00:00.000Z`)
               .lt('created_at', nextMonth.toISOString());
    }

    const { data: records, error } = await query;
    if (error) {
      console.error('GET /api/rent-records error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch rent records' }, { status: 500 });
    }

    return NextResponse.json(records || []);
  } catch (error) {
    console.error('GET /api/rent-records error:', error);
    return NextResponse.json({ error: 'Failed to fetch rent records' }, { status: 500 });
  }
}

// POST /api/rent-records — Create a rent payment record
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, pgId, month, amount, status, method, notes } = body;

    // TENANT can only create rent records for themselves
    const recordUserId = authResult.user.role === 'TENANT' ? authResult.user.id : userId;
    // Only OWNER can create with status PAID/COMPLETED
    const recordStatus = (authResult.user.role === 'TENANT') ? 'PENDING' : (status || 'PENDING');

    if (!recordUserId || !pgId || !amount) {
      return NextResponse.json({ error: 'userId, pgId, and amount required' }, { status: 400 });
    }

    const { data: record, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: recordUserId,
        pg_id: pgId,
        amount,
        type: 'RENT',
        status: recordStatus,
        method: method || null,
        notes: notes || null,
        paid_date: recordStatus === 'PAID' || recordStatus === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/rent-records error:', error.message);
      return NextResponse.json({ error: 'Failed to create rent record' }, { status: 500 });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('POST /api/rent-records error:', error);
    return NextResponse.json({ error: 'Failed to create rent record' }, { status: 500 });
  }
}

// PUT /api/rent-records — Update rent record (mark as paid)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, status, method, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record id required' }, { status: 400 });
    }

    // Ownership check: TENANT can only update their own records
    if (authResult.user.role === 'TENANT') {
      const { data: existingRecord } = await supabaseAdmin
        .from('payments')
        .select('user_id')
        .eq('id', id)
        .single();
      if (!existingRecord || existingRecord.user_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      // Tenants can only add method/notes, not change status
      const tenantUpdateData: Record<string, unknown> = {};
      if (method) tenantUpdateData.method = method;
      if (notes !== undefined) tenantUpdateData.notes = notes || null;

      const { data: record, error } = await supabaseAdmin
        .from('payments')
        .update(tenantUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('PUT /api/rent-records error:', error.message);
        return NextResponse.json({ error: 'Failed to update rent record' }, { status: 500 });
      }

      return NextResponse.json(record);
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (method) updateData.method = method;
    if (notes !== undefined) updateData.notes = notes || null;
    if ((status === 'PAID' || status === 'COMPLETED')) {
      updateData.paid_date = new Date().toISOString();
    }

    const { data: record, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('PUT /api/rent-records error:', error.message);
      return NextResponse.json({ error: 'Failed to update rent record' }, { status: 500 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('PUT /api/rent-records error:', error);
    return NextResponse.json({ error: 'Failed to update rent record' }, { status: 500 });
  }
}
