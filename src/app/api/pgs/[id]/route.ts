import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user is authenticated (to decide on masking bank details)
    let isAuthenticatedOwner = false;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const authResult = await requireSession(request);
        if (!('error' in authResult)) {
          isAuthenticatedOwner = true;
        }
      }
    } catch {
      // Not authenticated — that's fine for public PG data
    }

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

    // Mask bank account number for security
    const maskedBankAccount = pg.bank_account_number
      ? `****${pg.bank_account_number.slice(-4)}`
      : null;

    const formatted = {
      ...pg,
      images: pg.images ? pg.images.split(',').filter(Boolean) : [],
      amenities: pg.amenities ? pg.amenities.split(',').filter(Boolean) : [],
      bank_account_number: maskedBankAccount,
      bankAccountNumber: maskedBankAccount,
      bankAccountName: pg.bank_account_name,
      bankIfscCode: pg.bank_ifsc_code,
      bankName: pg.bank_name,
      bankBranch: pg.bank_branch,
      upiId: pg.upi_id,
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
