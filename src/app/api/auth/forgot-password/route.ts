/**
 * POST /api/auth/forgot-password
 * 
 * Sends a password reset link/OTP to the user's email or phone.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
    }

    // Find user
    let query = supabaseAdmin.from('users').select('id,name,email,phone,role');
    if (email) query = query.eq('email', email.toLowerCase().trim());
    if (phone) query = query.eq('phone', phone.replace(/\D/g, ''));

    const { data: users, error } = await query.limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'If an account exists, a reset link has been sent.' 
      });
    }

    const user = users[0];

    // Generate a password reset token (valid for 1 hour)
    const resetToken = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    console.log(`🔑 Password reset token for ${user.email}: ${resetToken}`);

    // Try to send via email if Resend is configured
    if (process.env.RESEND_API_KEY && user.email) {
      try {
        const Resend = (await import('resend')).Resend;
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'StayEg <noreply@stayeg.in>',
          to: user.email,
          subject: 'Reset your StayEg password',
          html: `
            <h2>Password Reset Request</h2>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password. Use this token to set a new password:</p>
            <p><strong>${resetToken}</strong></p>
            <p>This token expires in 1 hour. If you didn't request this, please ignore this email.</p>
          `,
        });
      } catch (emailError) {
        console.warn('Resend email failed:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists, a reset link has been sent.',
      simulated: !process.env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
