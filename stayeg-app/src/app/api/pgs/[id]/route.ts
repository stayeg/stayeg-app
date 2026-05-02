import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: pg, error } = await supabaseAdmin
      .from('pgs')
      .select('*, owner:users(id,name,phone,avatar,email), rooms(*, beds(*))')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'PG not found' }, { status: 404 });
      }
      console.error('Error fetching PG:', error.message);
      return NextResponse.json({ error: 'Failed to fetch PG' }, { status: 500 });
    }

    if (!pg) {
      return NextResponse.json({ error: 'PG not found' }, { status: 404 });
    }

    // Sort rooms by floor then room_code, and beds by bed_number
    const sortedRooms = (pg.rooms || [])
      .sort((a: any, b: any) => {
        if (a.floor !== b.floor) return a.floor - b.floor;
        return (a.room_code || '').localeCompare(b.room_code || '');
      })
      .map((room: any) => ({
        ...room,
        beds: (room.beds || []).sort((a: any, b: any) => a.bed_number - b.bed_number),
      }));

    const formatted = {
      ...pg,
      images: pg.images ? pg.images.split(',').filter(Boolean) : [],
      amenities: pg.amenities ? pg.amenities.split(',').filter(Boolean) : [],
      rooms: sortedRooms.map((room: any) => ({
        ...room,
        beds: room.beds.map((bed: any) => ({
          ...bed,
          price: bed.price ?? pg.price,
        })),
      })),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching PG:', error);
    return NextResponse.json({ error: 'Failed to fetch PG' }, { status: 500 });
  }
}
