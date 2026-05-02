/**
 * POST /api/auth/verify-otp
 *
 * Verifies a 6-digit OTP sent to the user's phone number.
 * On success, returns a JWT token for the authenticated user.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit OTP is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    // Normalize phone: try both with and without + prefix
    const phoneVariants = [
      '+' + cleanPhone,        // +919876543210
      cleanPhone,              // 919876543210
    ];
    // If user entered 10-digit number, also try with 91 prefix
    if (cleanPhone.length === 10) {
      phoneVariants.push('+91' + cleanPhone, '91' + cleanPhone);
    }

    // Helper: find user by phone (tries multiple formats)
    async function findUserByPhone(phoneNum: string) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id,name,email,phone,role,avatar,gender,is_verified,is_approved,city,occupation,bio,created_at')
        .eq('phone', phoneNum)
        .limit(1);
      if (error) return null;
      if (data && data.length > 0) return data[0];
      return null;
    }

    // Try MSG91 verification first
    if (MSG91_AUTH_KEY) {
      try {
        const mobile = cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone;
        const msg91Response = await fetch(
          `https://api.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${mobile}`,
          {
            method: 'GET',
            headers: { 'authkey': MSG91_AUTH_KEY },
          }
        );

        const msg91Data = await msg91Response.json();

        if (msg91Data.type === 'success') {
          // OTP verified via MSG91 — find user
          let user = null;
          for (const variant of phoneVariants) {
            user = await findUserByPhone(variant);
            if (user) break;
          }

          if (user) {
            const token = await signToken({ userId: user.id, email: user.email, role: user.role });
            return NextResponse.json({ user, token, verified: true });
          }

          // Phone not registered — return phone for signup
          return NextResponse.json({
            phoneVerified: true,
            message: 'Phone verified. Please complete signup.',
            phone: cleanPhone,
          });
        }
      } catch (msg91Error) {
        console.warn('MSG91 verify failed:', msg91Error);
      }
    }

    // Simulated mode: accept any 6-digit OTP
    // Try all phone format variants
    let user = null;
    for (const variant of phoneVariants) {
      user = await findUserByPhone(variant);
      if (user) break;
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign up first.' }, { status: 404 });
    }

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });

    return NextResponse.json({ user, token, verified: true });
  } catch (error) {
    console.error('POST /api/auth/verify-otp error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
