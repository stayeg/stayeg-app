import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';
import { stripHtml, isValidPhone, isValidEmail } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const city = searchParams.get('city');

    let query = supabaseAdmin
      .from('vendors')
      .select('id,name,type,phone,email,city,area,rating,description,created_at')
      .order('rating', { ascending: false });

    if (type) query = query.eq('type', type);
    if (city) query = query.eq('city', city);

    const { data: vendors, error } = await query;
    if (error) {
      console.error('GET /api/vendors error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
    }

    return NextResponse.json(vendors || []);
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/vendors' });
    console.error('GET /api/vendors error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: only OWNER and ADMIN can create vendors
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();

    if (!body.name || !body.type || !body.phone) {
      return NextResponse.json({ error: 'name, type, and phone are required' }, { status: 400 });
    }

    // Sanitize text inputs
    const sanitizedName = stripHtml(String(body.name).trim()).slice(0, 100);
    const sanitizedPhone = body.phone ? String(body.phone).trim() : '';
    const sanitizedEmail = body.email ? String(body.email).trim().toLowerCase() : null;
    const sanitizedCity = body.city ? stripHtml(String(body.city).trim()).slice(0, 50) : 'Bangalore';
    const sanitizedArea = body.area ? stripHtml(String(body.area).trim()).slice(0, 100) : null;

    // Validate phone if provided
    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }
    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .insert({
        name: sanitizedName,
        type: body.type,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        city: sanitizedCity,
        area: sanitizedArea,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/vendors' });
    console.error('POST /api/vendors error:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
