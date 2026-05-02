import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireSessionWithRole } from '@/lib/api-auth';

// In Supabase, tenants are users with active bookings in a PG.
// This route provides a tenant management view by combining bookings + users + beds + rooms.

// GET /api/tenants?ownerId=...&pgId=...&roomId=...&status=...&search=...
export async function GET(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can list tenants
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const pgId = searchParams.get('pgId');
    const status = searchParams.get('status');

    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
    }

    // OWNER can only view tenants for their own PGs; ADMIN can view any
    if (authResult.user.role === 'OWNER' && ownerId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden: can only view tenants for your own PGs' }, { status: 403 });
    }

    // Get all PG IDs for this owner
    let pgIds: string[] = [];
    if (pgId) {
      pgIds = [pgId];
    } else {
      const { data: pgs } = await supabaseAdmin
        .from('pgs')
        .select('id')
        .eq('owner_id', ownerId);
      pgIds = (pgs ?? []).map((p: { id: string }) => p.id);
    }

    if (pgIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch active bookings with user and bed details
    let statuses = ['ACTIVE', 'CONFIRMED'];
    if (status) statuses = [status];

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        user_id,
        pg_id,
        bed_id,
        check_in_date,
        status,
        advance_paid,
        created_at,
        user:users(id, name, email, phone, avatar, gender),
        bed:beds(id, bed_number, status, room_id, room:rooms(id, room_code, room_type, floor)),
        pg:pgs(id, name)
      `)
      .in('pg_id', pgIds)
      .in('status', statuses)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/tenants error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
    }

    // Transform bookings into tenant format
    const tenants = (bookings ?? []).map((b: Record<string, any>) => ({
      id: b.user_id,
      booking_id: b.id,
      pgId: b.pg_id,
      pgName: b.pg?.name,
      roomId: b.bed?.room_id,
      roomCode: b.bed?.room?.room_code,
      roomType: b.bed?.room?.room_type,
      floor: b.bed?.room?.floor,
      bedId: b.bed_id,
      bedNumber: b.bed?.bed_number,
      name: b.user?.name,
      email: b.user?.email,
      phone: b.user?.phone,
      avatar: b.user?.avatar,
      gender: b.user?.gender,
      checkInDate: b.check_in_date,
      status: b.status,
      advancePaid: b.advance_paid,
    }));

    return NextResponse.json(tenants);
  } catch (error) {
    console.error('GET /api/tenants error:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

// POST /api/tenants — Create a tenant (via booking)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, pgId, bedId, checkInDate, advancePaid } = body;

    if (!userId || !pgId || !bedId) {
      return NextResponse.json(
        { error: 'userId, pgId, and bedId are required' },
        { status: 400 }
      );
    }

    // Check bed is available
    const { data: bed, error: bedError } = await supabaseAdmin
      .from('beds')
      .select('status, room_id')
      .eq('id', bedId)
      .single();

    if (bedError) throw bedError;

    if (!bed || bed.status === 'OCCUPIED') {
      return NextResponse.json(
        { error: 'Bed is already occupied' },
        { status: 400 }
      );
    }

    // Verify room belongs to PG
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('id, pg_id')
      .eq('id', bed.room_id)
      .single();

    if (!room || room.pg_id !== pgId) {
      return NextResponse.json(
        { error: 'Bed does not belong to this PG' },
        { status: 400 }
      );
    }

    // Create booking
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        pg_id: pgId,
        bed_id: bedId,
        check_in_date: checkInDate ? new Date(checkInDate).toISOString() : new Date().toISOString(),
        advance_paid: advancePaid || 0,
        status: 'ACTIVE',
      })
      .select('*, user:users(id,name,email,phone), bed:beds(id,bed_number,room_id, room:rooms(id,room_code,room_type,floor)), pg:pgs(id,name)')
      .single();

    if (error) throw error;

    // Mark bed as occupied
    await supabaseAdmin.from('beds').update({ status: 'OCCUPIED' }).eq('id', bedId);

    // Log activity
    try {
      await supabaseAdmin.from('activity_log').insert({
        owner_id: body.ownerId,
        action: 'TENANT_ADDED',
        details: `Added tenant to bed #${(bed as Record<string, unknown>)?.bed_number || bedId}`,
      });
    } catch { /* ignore log failures */ }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('POST /api/tenants error:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}

// PUT /api/tenants — Update tenant (change bed/status)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { bookingId, status, newBedId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // Fetch existing booking
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, bed_id, status')
      .eq('id', bookingId)
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

      // Release old bed, occupy new
      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', existing.bed_id);
      await supabaseAdmin.from('beds').update({ status: 'OCCUPIED' }).eq('id', newBedId);
    }

    // Handle status change
    if (status === 'CANCELLED' || status === 'COMPLETED') {
      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', existing.bed_id);
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (newBedId) updateData.bed_id = newBedId;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(booking);
  } catch (error) {
    console.error('PUT /api/tenants error:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

// DELETE /api/tenants — Remove tenant (cancel booking, free bed)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // Fetch booking to get bed_id
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('bed_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Cancel booking
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', bookingId);

    if (error) throw error;

    // Free the bed
    if (booking.bed_id) {
      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', booking.bed_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tenants error:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
