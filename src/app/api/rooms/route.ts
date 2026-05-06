import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireSessionWithRole } from '@/lib/api-auth';

// GET /api/rooms?pgId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pgId = searchParams.get('pgId');

    if (!pgId) {
      return NextResponse.json({ error: 'pgId is required' }, { status: 400 });
    }

    const { data: rooms, error } = await supabaseAdmin
      .from('rooms')
      .select('*, beds(*)')
      .eq('pg_id', pgId)
      .order('floor', { ascending: true })
      .order('room_code', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    return NextResponse.json(rooms || []);
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/rooms' });
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

// POST /api/rooms — Create a new room in a PG
export async function POST(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can create rooms
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { pgId, roomCode, roomType, floor, hasAC, hasAttachedBath } = body;

    if (!pgId || !roomCode || !roomType) {
      return NextResponse.json(
        { error: 'pgId, roomCode, and roomType are required' },
        { status: 400 }
      );
    }

    const validRoomTypes = ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY', 'SHARED'];
    if (!validRoomTypes.includes(roomType)) {
      return NextResponse.json(
        { error: `Invalid roomType. Must be one of: ${validRoomTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the PG exists
    const { data: pg, error: pgError } = await supabaseAdmin
      .from('pgs')
      .select('id, owner_id')
      .eq('id', pgId)
      .single();

    if (pgError || !pg) {
      return NextResponse.json({ error: 'PG not found' }, { status: 404 });
    }

    // SECURITY FIX: Verify ownership — owners can only create rooms in their own PGs
    if (authResult.user.role !== 'ADMIN' && pg.owner_id !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only create rooms in your own PGs' }, { status: 403 });
    }

    // Check for duplicate room code in the same PG
    const { data: existingRoom } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('pg_id', pgId)
      .eq('room_code', roomCode)
      .maybeSingle();

    if (existingRoom) {
      return NextResponse.json(
        { error: `Room with code "${roomCode}" already exists in this PG` },
        { status: 409 }
      );
    }

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        pg_id: pgId,
        room_code: roomCode,
        room_type: roomType,
        floor: floor ?? 1,
        has_ac: hasAC ?? false,
        has_attached_bath: hasAttachedBath ?? false,
      })
      .select('*, beds(*)')
      .single();

    if (error) throw error;

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/rooms' });
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

// PUT /api/rooms — Update a room
export async function PUT(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can update rooms
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // SECURITY FIX: Verify ownership — owners can only update rooms in their own PGs
    if (authResult.user.role !== 'ADMIN') {
      const { data: room } = await supabaseAdmin
        .from('rooms')
        .select('pg_id')
        .eq('id', id)
        .single();

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const { data: pg } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', room.pg_id)
        .single();

      if (!pg || pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden: you can only update rooms in your own PGs' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.roomCode !== undefined) updateData.room_code = data.roomCode;
    if (data.roomType !== undefined) updateData.room_type = data.roomType;
    if (data.floor !== undefined) updateData.floor = data.floor;
    if (data.hasAC !== undefined) updateData.has_ac = data.hasAC;
    if (data.hasAttachedBath !== undefined) updateData.has_attached_bath = data.hasAttachedBath;

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select('*, beds(*)')
      .single();

    if (error) throw error;

    return NextResponse.json(room);
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/rooms' });
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

// DELETE /api/rooms?roomId=...
export async function DELETE(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can delete rooms
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    // SECURITY FIX: Verify ownership — owners can only delete rooms in their own PGs
    if (authResult.user.role !== 'ADMIN') {
      const { data: room } = await supabaseAdmin
        .from('rooms')
        .select('pg_id')
        .eq('id', roomId)
        .single();

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const { data: pg } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', room.pg_id)
        .single();

      if (!pg || pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden: you can only delete rooms in your own PGs' }, { status: 403 });
      }
    }

    // Check for occupied beds before deleting
    const { data: occupiedBeds } = await supabaseAdmin
      .from('beds')
      .select('id')
      .eq('room_id', roomId)
      .eq('status', 'OCCUPIED');

    if (occupiedBeds && occupiedBeds.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete room with occupied beds. Free all beds first.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('rooms').delete().eq('id', roomId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    captureException(error, { endpoint: 'DELETE /api/rooms' });
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
