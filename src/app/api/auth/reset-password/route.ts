/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a valid JWT reset token.
 * The token must have been issued by /api/auth/forgot-password.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Verify the reset token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', payload.userId);

    if (error) {
      console.error('Password reset update error:', error.message);
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
