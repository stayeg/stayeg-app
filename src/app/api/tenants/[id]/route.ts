import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';

// SECURITY FIX (v3): Replaced getOwnerSession() (x-user-email header) 
// with proper JWT-based authentication via requireSessionWithRole.
// The x-user-email header was forgeable — anyone could impersonate an owner.

// ============================
// GET /api/tenants/[id] — fetch single tenant booking details
// ============================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
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

    // Owner-scoping: verify the booking's PG belongs to this owner (unless ADMIN)
    if (authResult.user.role !== 'ADMIN' && booking.pg?.owner_id && booking.pg.owner_id !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden: not your tenant' }, { status: 403 });
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
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    const body = await request.json();
    const { status, newBedId } = body;

    // Fetch existing booking
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, bed_id, status, pg:pgs(owner_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Owner-scoping: verify this booking belongs to the owner's PG (unless ADMIN)
    if (authResult.user.role !== 'ADMIN' && (existing as any)?.pg?.owner_id && (existing as any).pg.owner_id !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden: not your tenant' }, { status: 403 });
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
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;

    // Fetch booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, bed_id, status, pg:pgs(owner_id)')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Owner-scoping: verify this booking belongs to the owner's PG (unless ADMIN)
    if (authResult.user.role !== 'ADMIN' && (booking as any)?.pg?.owner_id && (booking as any).pg.owner_id !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden: not your tenant' }, { status: 403 });
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
