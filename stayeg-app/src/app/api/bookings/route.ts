import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Require authentication for booking data access
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pgId = searchParams.get('pgId');

    if (!userId && !pgId) {
      return NextResponse.json({ error: 'userId or pgId is required' }, { status: 400 });
    }

    // Tenants can only view their own bookings; owners can view their PG's bookings
    if (userId && authResult.user.role === 'TENANT' && userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabaseAdmin
      .from('bookings')
      .select('*, pg:pgs(id,name,address,city,images), bed:beds(*, room:rooms(room_code,room_type,floor)), user:users(id,name,email,phone,avatar), payments:payments(*)')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (pgId) query = query.eq('pg_id', pgId);

    const { data: bookings, error } = await query;
    if (error) {
      console.error('Error fetching bookings:', error.message);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const formatted = (bookings || []).map((b: Record<string, any>) => ({
      ...b,
      pg: b.pg
        ? {
            ...b.pg,
            images: b.pg.images ? b.pg.images.split(',').filter(Boolean) : [],
          }
        : undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: verify user session before creating booking
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, pgId, bedId, checkInDate, advancePaid } = body;

    // Users can only create bookings for themselves
    if (userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden: can only book for yourself' }, { status: 403 });
    }

    if (!userId || !pgId || !bedId || !checkInDate) {
      return NextResponse.json(
        { error: 'userId, pgId, bedId, and checkInDate are required' },
        { status: 400 }
      );
    }

    // Prevent double booking: check if bed is already occupied
    const { data: existingBed, error: bedCheckError } = await supabaseAdmin
      .from('beds')
      .select('status')
      .eq('id', bedId)
      .single();

    if (bedCheckError) throw bedCheckError;

    if (existingBed && existingBed.status === 'OCCUPIED') {
      return NextResponse.json(
        { error: 'This bed is already booked. Please select another bed.' },
        { status: 409 }
      );
    }

    // Check for any active booking on this bed
    const { data: activeBooking, error: activeCheckError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('bed_id', bedId)
      .in('status', ['PENDING', 'CONFIRMED', 'ACTIVE'])
      .maybeSingle();

    if (activeCheckError) throw activeCheckError;

    if (activeBooking) {
      return NextResponse.json(
        { error: 'This bed already has an active booking. Please select another bed.' },
        { status: 409 }
      );
    }

    // Create booking first
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        pg_id: pgId,
        bed_id: bedId,
        check_in_date: new Date(checkInDate).toISOString(),
        advance_paid: advancePaid || 0,
      })
      .select('*, pg:pgs(name), bed:beds(*)')
      .single();

    if (bookingError) throw bookingError;

    // Then update bed status
    await supabaseAdmin.from('beds').update({ status: 'OCCUPIED' }).eq('id', bedId);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Auth guard: verify user session before updating booking
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'bookingId and status required' }, { status: 400 });
    }

    // Only owners can update booking status (approve/cancel), tenants can only cancel their own
    const accessResult = await supabaseAdmin
      .from('bookings')
      .select('user_id, pg:pgs(owner_id)')
      .eq('id', bookingId)
      .single();

    if (accessResult.error) throw accessResult.error;
    const accessData = accessResult.data;

    const isOwner = authResult.user.role === 'OWNER' && (accessData as any)?.pg?.owner_id === authResult.user.id;
    const isOwnBooking = (accessData as any)?.user_id === authResult.user.id;
    const isAdmin = authResult.user.role === 'ADMIN';

    if (!isOwner && !isOwnBooking && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: cannot modify this booking' }, { status: 403 });
    }

    // Tenants can only cancel their own bookings, not set arbitrary statuses
    if (isOwnBooking && !isAdmin && status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Forbidden: tenants can only cancel bookings' }, { status: 403 });
    }

    // Fetch booking first to get bedId
    const existingResult = await supabaseAdmin
      .from('bookings')
      .select('bed_id')
      .eq('id', bookingId)
      .single();

    if (existingResult.error) throw existingResult.error;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    if (status === 'CANCELLED' && existingResult.data?.bed_id) {
      await supabaseAdmin.from('beds').update({ status: 'AVAILABLE' }).eq('id', existingResult.data.bed_id);
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
