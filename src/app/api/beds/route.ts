import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';

// POST /api/beds — Create a new bed under a room
export async function POST(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can create beds
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { roomId, bedNumber, price, status } = body;

    if (!roomId || bedNumber === undefined || bedNumber === null) {
      return NextResponse.json(
        { error: 'roomId and bedNumber are required' },
        { status: 400 }
      );
    }

    if (bedNumber < 1) {
      return NextResponse.json(
        { error: 'bedNumber must be a positive integer' },
        { status: 400 }
      );
    }

    // Verify the room exists
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, pg_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // SECURITY FIX: Verify ownership — owners can only create beds in their own PGs
    if (authResult.user.role !== 'ADMIN') {
      const { data: pg } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', room.pg_id)
        .single();

      if (!pg || pg.owner_id !== authResult.user.id) {
        return NextResponse.json(
          { error: 'Forbidden: you can only create beds in your own PGs' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate bed number in the same room
    const { data: existingBed } = await supabaseAdmin
      .from('beds')
      .select('id')
      .eq('room_id', roomId)
      .eq('bed_number', bedNumber)
      .maybeSingle();

    if (existingBed) {
      return NextResponse.json(
        { error: `Bed #${bedNumber} already exists in this room` },
        { status: 409 }
      );
    }

    const { data: bed, error } = await supabaseAdmin
      .from('beds')
      .insert({
        room_id: roomId,
        bed_number: bedNumber,
        price: price ?? null,
        status: status ?? 'AVAILABLE',
      })
      .select('*, room:rooms(id, room_code, pg:pgs(id, name))')
      .single();

    if (error) throw error;

    return NextResponse.json(bed, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/beds' });
    console.error('Error creating bed:', error);
    return NextResponse.json(
      { error: 'Failed to create bed' },
      { status: 500 }
    );
  }
}

// PUT /api/beds — Update a bed's status (and optionally price)
export async function PUT(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can update beds
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, status, price } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch current bed
    const { data: currentBed, error: fetchError } = await supabaseAdmin
      .from('beds')
      .select('id, status, room_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentBed) {
      return NextResponse.json(
        { error: 'Bed not found' },
        { status: 404 }
      );
    }

    // SECURITY FIX: Verify ownership — owners can only update beds in their own PGs
    if (authResult.user.role !== 'ADMIN') {
      const { data: roomData } = await supabaseAdmin
        .from('rooms')
        .select('pg_id')
        .eq('id', currentBed.room_id)
        .single();

      if (roomData) {
        const { data: pg } = await supabaseAdmin
          .from('pgs')
          .select('owner_id')
          .eq('id', roomData.pg_id)
          .single();

        if (!pg || pg.owner_id !== authResult.user.id) {
          return NextResponse.json(
            { error: 'Forbidden: you can only update beds in your own PGs' },
            { status: 403 }
          );
        }
      }
    }

    const updateData: Record<string, unknown> = { status };
    if (price !== undefined) updateData.price = price;

    const { data: bed, error } = await supabaseAdmin
      .from('beds')
      .update(updateData)
      .eq('id', id)
      .select('*, room:rooms(id, room_code, pg:pgs(id, name))')
      .single();

    if (error) throw error;

    return NextResponse.json(bed);
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/beds' });
    console.error('Error updating bed:', error);
    return NextResponse.json(
      { error: 'Failed to update bed' },
      { status: 500 }
    );
  }
}
