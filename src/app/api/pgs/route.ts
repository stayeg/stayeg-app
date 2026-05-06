import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireSessionWithRole } from '@/lib/api-auth';
import { captureException } from '@/lib/sentry-server';
import { sanitizeLikePattern, stripHtml, isValidPositiveNumber, isValidIFSC } from '@/lib/validation';
import { getPaginationParams, applyPaginationRange, createPaginatedResponse } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let query = supabaseAdmin
      .from('pgs')
      .select('*, owner:users(id,name,phone,avatar), rooms(*, beds(*))', { count: 'exact' });

    const ownerId = searchParams.get('ownerId') || '';
    const gender = searchParams.get('gender') || '';
    const queryStr = searchParams.get('query') || '';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const sortBy = searchParams.get('sortBy') || 'rating';
    const city = searchParams.get('city') || 'Bangalore';
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];

    // Owner view: show all their PGs regardless of status
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    } else {
      query = query.eq('status', 'APPROVED').eq('city', city);
    }

    if (gender && gender !== 'ALL') {
      query = query.eq('gender', gender);
    }

    if (queryStr) {
      const sanitizedQuery = queryStr.replace(/[%_\\]/g, '\\$&');
      query = query.or(`name.ilike.%${sanitizedQuery}%,address.ilike.%${sanitizedQuery}%`);
    }

    if (minPrice > 0) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice < 999999) {
      query = query.lte('price', maxPrice);
    }

    // Amenities filter: chain .like for each amenity (sanitize wildcards)
    for (const a of amenities) {
      query = query.like('amenities', `%${sanitizeLikePattern(a)}%`);
    }

    // Sorting
    if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
    else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
    else if (sortBy === 'rating') query = query.order('rating', { ascending: false });
    else if (sortBy === 'newest') query = query.order('created_at', { ascending: false });

    // Apply pagination (replaces hard limit of 50)
    const pagination = getPaginationParams(request);
    const { from, to } = applyPaginationRange(pagination);
    query = query.range(from, to);

    const { data: pgs, count, error } = await query;
    if (error) {
      console.error('Error fetching PGs:', error.message);
      return NextResponse.json({ error: 'Failed to fetch PGs' }, { status: 500 });
    }

    const formatted = (pgs || []).map((pg: Record<string, unknown>) => ({
      ...pg,
      images: typeof pg.images === 'string' ? pg.images.split(',').filter(Boolean) : [],
      amenities: typeof pg.amenities === 'string' ? pg.amenities.split(',').filter(Boolean) : [],
      rooms: Array.isArray(pg.rooms) ? (pg.rooms as Record<string, unknown>[]).map((room) => ({
        ...room,
        beds: Array.isArray(room.beds) ? (room.beds as Record<string, unknown>[]).map((bed) => ({
          ...bed,
          price: bed.price ?? (pg as Record<string, unknown>).price,
        })) : [],
      })) : [],
    }));

    return NextResponse.json(createPaginatedResponse(formatted, count || 0, pagination), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/pgs' });
    console.error('Error fetching PGs:', error);
    return NextResponse.json({ error: 'Failed to fetch PGs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can create PGs
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { name, description, address, city, gender, price, securityDeposit, amenities, images } = body;
    if (!name || !address) {
      return NextResponse.json({ error: 'name and address are required' }, { status: 400 });
    }

    // Validate numeric fields
    if (price !== undefined && !isValidPositiveNumber(price, true)) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }
    if (securityDeposit !== undefined && !isValidPositiveNumber(securityDeposit, true)) {
      return NextResponse.json({ error: 'Security deposit must be a positive number' }, { status: 400 });
    }

    // Sanitize text inputs
    const sanitizedName = stripHtml(String(name).trim()).slice(0, 200);
    const sanitizedDescription = description ? stripHtml(String(description).trim()).slice(0, 2000) : null;
    const sanitizedAddress = stripHtml(String(address).trim()).slice(0, 500);
    const sanitizedCity = city ? stripHtml(String(city).trim()).slice(0, 50) : 'Bangalore';

    // SECURITY FIX (v3): Always use authenticated user's ID as owner_id
    // Owners can no longer create PGs under a different owner's ID
    const ownerId = authResult.user.id;

    const { data: pg, error } = await supabaseAdmin
      .from('pgs')
      .insert({
        name: sanitizedName,
        owner_id: ownerId,
        description: sanitizedDescription,
        address: sanitizedAddress,
        city: sanitizedCity,
        gender: gender || 'UNISEX',
        price: price || 0,
        security_deposit: securityDeposit || 0,
        amenities: amenities ? amenities.join(',') : '',
        images: images ? images.join(',') : '',
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(pg, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/pgs' });
    console.error('Error creating PG:', error);
    return NextResponse.json({ error: 'Failed to create PG' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can update PGs
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // SECURITY FIX (v3): Verify ownership — owners can only update their own PGs
    if (authResult.user.role !== 'ADMIN') {
      const { data: pg, error: pgError } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', id)
        .single();
      
      if (pgError || !pg) {
        return NextResponse.json({ error: 'PG not found' }, { status: 404 });
      }
      if (pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden: you can only update your own PGs' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = stripHtml(String(data.name).trim()).slice(0, 200);
    if (data.description !== undefined) updateData.description = stripHtml(String(data.description).trim()).slice(0, 2000);
    if (data.address !== undefined) updateData.address = stripHtml(String(data.address).trim()).slice(0, 500);
    if (data.city !== undefined) updateData.city = stripHtml(String(data.city).trim()).slice(0, 50);
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.price !== undefined) {
      if (!isValidPositiveNumber(data.price, true)) {
        return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
      }
      updateData.price = data.price;
    }
    if (data.securityDeposit !== undefined) {
      if (!isValidPositiveNumber(data.securityDeposit, true)) {
        return NextResponse.json({ error: 'Security deposit must be a positive number' }, { status: 400 });
      }
      updateData.security_deposit = data.securityDeposit;
    }
    if (data.amenities !== undefined) updateData.amenities = Array.isArray(data.amenities) ? data.amenities.join(',') : data.amenities;
    if (data.images !== undefined) updateData.images = Array.isArray(data.images) ? data.images.join(',') : data.images;

    // Bank account details for PG owners (payment settlement)
    if (data.bankAccountName !== undefined) updateData.bank_account_name = String(data.bankAccountName).trim().slice(0, 100);
    if (data.bankAccountNumber !== undefined) {
      const acctNum = String(data.bankAccountNumber).trim();
      if (acctNum && (acctNum.length < 8 || acctNum.length > 18 || !/^\d+$/.test(acctNum))) {
        return NextResponse.json({ error: 'Bank account number must be 8-18 digits' }, { status: 400 });
      }
      updateData.bank_account_number = acctNum;
    }
    if (data.bankIfscCode !== undefined) {
      if (data.bankIfscCode && !isValidIFSC(String(data.bankIfscCode))) {
        return NextResponse.json({ error: 'Invalid IFSC code format' }, { status: 400 });
      }
      updateData.bank_ifsc_code = String(data.bankIfscCode).trim().toUpperCase();
    }
    if (data.bankName !== undefined) updateData.bank_name = String(data.bankName).trim().slice(0, 100);
    if (data.bankBranch !== undefined) updateData.bank_branch = String(data.bankBranch).trim().slice(0, 100);
    if (data.upiId !== undefined) {
      const upi = String(data.upiId).trim();
      if (upi && !upi.includes('@')) {
        return NextResponse.json({ error: 'Invalid UPI ID format' }, { status: 400 });
      }
      updateData.upi_id = upi;
    }

    // SECURITY FIX (v3): Only ADMIN can change status and verification
    // Owners can no longer self-approve or self-verify their PGs
    if (authResult.user.role === 'ADMIN') {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isVerified !== undefined) updateData.is_verified = data.isVerified;
      if (data.isApproved !== undefined) updateData.is_approved = data.isApproved;
    }

    const { data: pg, error } = await supabaseAdmin
      .from('pgs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(pg);
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/pgs' });
    console.error('Error updating PG:', error);
    return NextResponse.json({ error: 'Failed to update PG' }, { status: 500 });
  }
}
