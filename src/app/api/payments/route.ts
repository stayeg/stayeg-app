import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Auth guard: verify user session before fetching payments
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const pgId = searchParams.get('pgId');
    const status = searchParams.get('status');

    // TENANT can only view their own payments
    if (authResult.user.role === 'TENANT') {
      userId = authResult.user.id;
    }

    let query = supabaseAdmin
      .from('payments')
      .select('*, pg:pgs(id,name), user:users(id,name,email,phone,avatar)')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (pgId) query = query.eq('pg_id', pgId);
    if (status) query = query.eq('status', status);

    const { data: payments, error } = await query;
    if (error) {
      console.error('Error fetching payments:', error.message);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    return NextResponse.json(payments || []);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: verify user session before creating payment
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, pgId, bookingId, amount, type, method } = body;

    // TENANT can only create payments for themselves
    const paymentUserId = authResult.user.role === 'TENANT' ? authResult.user.id : userId;
    // Tenants cannot set status to COMPLETED directly
    const paymentStatus = (authResult.user.role === 'TENANT') ? 'PENDING' : (status || 'COMPLETED');

    if (!paymentUserId || !pgId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: paymentUserId,
        pg_id: pgId,
        booking_id: bookingId || null,
        amount,
        type: type || 'RENT',
        method: method || 'UPI',
        status: paymentStatus,
        paid_date: paymentStatus === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Auth guard: verify user session before updating payment
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, status, paidDate, method } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    // Ownership check
    if (authResult.user.role === 'TENANT') {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('user_id')
        .eq('id', id)
        .single();
      if (!existingPayment || existingPayment.user_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (paidDate) updateData.paid_date = new Date(paidDate).toISOString();
    if (method) updateData.method = method;
    if (status === 'COMPLETED' && !paidDate) updateData.paid_date = new Date().toISOString();

    // Tenants cannot change status directly
    if (authResult.user.role === 'TENANT') {
      delete updateData.status;
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
