/**
 * Authentication API — StayEg v2
 * 
 * GET  /api/auth       — User lookup (login by email/phone), requires password or OTP
 * GET  /api/auth?role=  — List users by role (admin)
 * POST /api/auth       — Register new user (with password hashing)
 * PUT  /api/auth       — Update profile (session-verified)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireSessionWithRole } from '@/lib/api-auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/jwt';

// ============================
// GET — Login / User lookup
// ============================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const role = searchParams.get('role');
    const pgId = searchParams.get('pgId');
    const password = searchParams.get('password');

    // --- Login: fetch user by email or phone ---
    if (email || phone) {
      let query = supabaseAdmin
        .from('users')
        .select('id,name,email,phone,role,avatar,gender,is_verified,is_approved,city,occupation,bio,created_at,password_hash');

      if (email) query = query.eq('email', email.toLowerCase().trim());
      if (phone) query = query.eq('phone', phone.trim());

      const { data: users, error } = await query.limit(1);

      if (error) {
        console.error('GET /api/auth lookup error:', error.message);
        return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
      }

      if (!users || users.length === 0) {
        return NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 });
      }

      const user = users[0];

      // Password verification
      if (user.password_hash && password) {
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid password', code: 'INVALID_PASSWORD' }, { status: 401 });
        }
      } else if (user.password_hash && !password) {
        return NextResponse.json({ error: 'Password required', code: 'PASSWORD_REQUIRED' }, { status: 401 });
      }

      // Generate JWT token
      const token = await signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Return user data + token
      return NextResponse.json({
        user,
        token,
      });
    }

    // If pgId provided, get tenants for that PG
    if (pgId) {
      // Only owners or admins can list PG tenants
      const pgAuthResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
      if ('error' in pgAuthResult) return pgAuthResult.error;

      const { data: bookings, error } = await supabaseAdmin
        .from('bookings')
        .select('*, user:users(id,name,email,phone,avatar,gender), bed:beds(id,bed_number,status)')
        .in('status', ['ACTIVE', 'CONFIRMED'])
        .eq('pg_id', pgId);

      if (error) {
        console.error('GET /api/auth tenants error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch PG tenants' }, { status: 500 });
      }

      return NextResponse.json({ data: bookings || [] });
    }

    // List all users (admin only)
    const authResult = await requireSessionWithRole(request, ['ADMIN']);
    if ('error' in authResult) return authResult.error;

    let query = supabaseAdmin
      .from('users')
      .select('id,name,email,phone,role,avatar,gender,is_verified,created_at')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data: users, error } = await query;
    if (error) {
      console.error('GET /api/auth list error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('GET /api/auth error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// ============================
// POST — Register new user
// ============================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, role, gender, bio, city, occupation } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate email
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1);

    if (checkError) {
      console.error('POST /api/auth duplicate check error:', checkError.message);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate phone
    if (phone) {
      const { data: existingPhone } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phone.trim())
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Create user — OWNER role requires admin approval
    const userRole = role || 'TENANT';
    const isApproved = userRole === 'OWNER' ? false : true;

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        role: userRole,
        gender: gender || null,
        is_verified: isApproved,
        is_approved: isApproved,
        bio: bio || null,
        city: city || null,
        occupation: occupation || null,
        password_hash: hashedPassword,
      })
      .select('id,name,email,phone,role,avatar,gender,is_verified,is_approved,city,occupation,bio,created_at')
      .single();

    const user = insertedUser;
    const error = insertError;

    if (error || !user) {
      console.error('POST /api/auth insert error:', error?.message || 'Unknown error');
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Generate JWT token for auto-login
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error) {
    console.error('POST /api/auth error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// ============================
// PUT — Update profile
// ============================

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const user = authResult.user;
    const userId = user.id;

    // Build update object — only include fields that are provided
    const updates: Record<string, unknown> = {};
    const allowedFields = ['name', 'phone', 'gender', 'city', 'occupation', 'bio', 'avatar', 'aadhaar_number', 'pan_number', 'kyc_status'];

    for (const field of allowedFields) {
      const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (body[field] !== undefined) {
        updates[snakeField] = body[field];
      }
      if (body[snakeField] !== undefined) {
        updates[snakeField] = body[snakeField];
      }
    }

    // Allow password change
    if (body.currentPassword && body.newPassword) {
      // Verify current password first
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (existingUser?.password_hash) {
        const isValid = await verifyPassword(body.currentPassword, existingUser.password_hash);
        if (!isValid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
        }
      }

      updates.password_hash = await hashPassword(body.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id,name,email,phone,role,avatar,gender,is_verified,is_approved,city,occupation,bio,aadhaar_number,pan_number,kyc_status,created_at,updated_at')
      .single();

    if (error) {
      console.error('PUT /api/auth update error:', error.message);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('PUT /api/auth error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
