/**
 * POST /api/auth/send-otp
 * 
 * Sends a 6-digit OTP to the user's phone number.
 * Uses MSG91 OTP API if configured, otherwise falls back to console log.
 * OTP is stored in the `otp_code` and `otp_expires_at` columns of the users table.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || 'stayeg_otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Check if user exists with this phone number
    const { data: users, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .limit(1);

    if (lookupError) {
      console.error('OTP lookup error:', lookupError.message);
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }

    // Generate a 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // If user exists, store OTP in their record
    if (users && users.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          otp_code: otp,
          otp_expires_at: expiresAt,
        })
        .eq('id', users[0].id);

      if (updateError) {
        console.error('OTP store error:', updateError.message);
      }
    }

    // Try sending via MSG91
    if (MSG91_AUTH_KEY) {
      try {
        const msg91Response = await fetch('https://api.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authkey': MSG91_AUTH_KEY,
          },
          body: JSON.stringify({
            template_id: MSG91_TEMPLATE_ID,
            mobile: cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone,
            otp,
          }),
        });

        const msg91Data = await msg91Response.json();

        if (msg91Data.type === 'success') {
          return NextResponse.json({ 
            success: true, 
            message: 'OTP sent successfully',
            otpExpiry: expiresAt,
          });
        }

        console.warn('MSG91 API error:', msg91Data.message);
        // Fall through to simulated OTP
      } catch (msg91Error) {
        console.warn('MSG91 send failed:', msg91Error);
        // Fall through to simulated OTP
      }
    }

    // Simulated OTP fallback — OTP is stored in DB and logged
    console.log(`📱 SIMULATED OTP for ${cleanPhone}: ${otp} (expires: ${expiresAt})`);

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully',
      simulated: !MSG91_AUTH_KEY,
      otpExpiry: expiresAt,
    });
  } catch (error) {
    console.error('POST /api/auth/send-otp error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
