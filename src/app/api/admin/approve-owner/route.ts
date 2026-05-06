import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

// SECURITY FIX (v3): Removed hardcoded admin secret fallback.
// ADMIN_SECRET must be set via environment variable — no default.
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function verifyAdminSecret(request: NextRequest): NextResponse | null {
  if (!ADMIN_SECRET) {
    console.error('[ADMIN] ADMIN_SECRET not configured in environment');
    return NextResponse.json({ error: 'Admin access not configured' }, { status: 503 });
  }
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null; // OK
}

// GET - List pending owner signups (role='OWNER' AND is_approved=false)
export async function GET(request: NextRequest) {
  try {
    const forbidden = verifyAdminSecret(request);
    if (forbidden) return forbidden;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id,name,email,phone,role,gender,is_verified,is_approved,city,occupation,bio,created_at')
      .eq('role', 'OWNER')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching owners:', error.message);
      return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 });
    }

    const pending = (data || []).filter((u: { is_approved: boolean }) => !u.is_approved);
    const approved = (data || []).filter((u: { is_approved: boolean }) => u.is_approved);

    return NextResponse.json({ pending, approved });
  } catch (error) {
    console.error('GET /api/admin/approve-owner error:', error);
    return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 });
  }
}

// PUT - Approve or reject an owner signup
export async function PUT(request: NextRequest) {
  try {
    const forbidden = verifyAdminSecret(request);
    if (forbidden) return forbidden;

    const { userId, action, reason } = await request.json();

    if (!userId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      is_approved: action === 'approve',
      is_verified: action === 'approve',
      updated_at: new Date().toISOString(),
    };

    if (action === 'reject' && reason) {
      updateData.rejection_reason = reason;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id,name,email,phone,role,is_approved,is_verified')
      .single();

    if (error) {
      console.error('Error updating owner:', error.message);
      return NextResponse.json({ error: 'Failed to update owner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('PUT /api/admin/approve-owner error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
