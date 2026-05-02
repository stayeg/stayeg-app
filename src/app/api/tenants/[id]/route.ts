import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

// Auth helper: verify user is an owner via x-user-email
async function getOwnerSession(request: NextRequest) {
  const userEmail = request.headers.get('x-user-email');
  if (!userEmail) {
    return { error: NextResponse.json({ error: 'Authentication required: missing user identity' }, { status: 401 }) };
  }
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('email', userEmail)
    .limit(1)
    .single();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Authentication failed: user not found' }, { status: 401 }) };
  }
  if (user.role !== 'OWNER') {
    return { error: NextResponse.json({ error: 'Forbidden: owner access required' }, { status: 403 }) };
  }
  return { user };
}

// ============================
// GET /api/tenants/[id] — fetch single tenant booking details
// ============================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getOwnerSession(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        user:users(id, name, email, phone, avatar, gender, city),
        bed:beds(id, bed_number, status, price, room_id, room:rooms(id, room_code, room_type, floor, has_ac, has_attached_bath)),
        pg:pgs(id, name, address, city),
        payments:payments(id, amount, type, status, created_at, paid_date)
      `)
      .eq('id', id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Tenant booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

// ============================
// PUT /api/tenants/[id] — update a single tenant booking
// ============================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getOwnerSession(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    const body = await request.json();
    const { status, newBedId } = body;

    // Fetch existing booking
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, bed_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Handle bed change
    if (newBedId && newBedId !== existing.bed_id) {
      const { data: newBed } = await supabaseAdmin
        .from('beds')
        .select('id, status')
        .eq('id', newBedId)
        .single();

      if (!newBed || newBed.status === 'OCCUPIED') {
        return NextResponse.json({ error: 'Target bed is not available' }, { status: 409 });
      }

      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', existing.bed_id);
      await supabaseAdmin.from('beds').update({ status: 'OCCUPIED' }).eq('id', newBedId);
    }

    // Handle status change
    if (status === 'CANCELLED' || status === 'COMPLETED') {
      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', existing.bed_id);
    } else if (status === 'ACTIVE' && (existing.status === 'CANCELLED' || existing.status === 'COMPLETED')) {
      await supabaseAdmin.from('beds').update({ status: 'OCCUPIED' }).eq('id', existing.bed_id);
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (newBedId) updateData.bed_id = newBedId;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user:users(id, name, email, phone),
        bed:beds(id, bed_number, status, room:rooms(id, room_code, room_type, floor)),
        pg:pgs(id, name, address)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

// ============================
// DELETE /api/tenants/[id] — delete a tenant booking
// ============================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getOwnerSession(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;

    // Fetch booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, bed_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Cancel the booking
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', id);

    if (error) throw error;

    // Free the bed if it was active
    if (booking.status === 'ACTIVE' || booking.status === 'CONFIRMED') {
      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', booking.bed_id);
    }

    return NextResponse.json({ success: true, message: 'Tenant has been removed' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
