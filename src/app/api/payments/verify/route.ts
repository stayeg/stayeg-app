/**
 * POST /api/payments/verify
 *
 * Verifies a RazorPay payment and records it in the database.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { verifyPayment } from '@/lib/razorpay';
import { sendNotification } from '@/lib/notifications';
import { captureException } from '@/lib/sentry-server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { orderId, paymentId, signature, amount, pgId, bookingId, type, method } = body;

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: 'Order ID and Payment ID are required' }, { status: 400 });
    }

    // Verify payment signature
    const isValid = await verifyPayment({ orderId, paymentId, signature });

    // Determine status and note based on verification result
    const status = isValid ? 'COMPLETED' : 'PENDING';
    const verification_note = isValid
      ? 'Auto-verified: Razorpay signature confirmed'
      : signature
        ? 'Pending manual verification: signature invalid'
        : 'Pending manual verification: simulated mode (no Razorpay config)';

    // Record the payment in database
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: authResult.user.id,
        pg_id: pgId || null,
        booking_id: bookingId || null,
        amount: amount || 0,
        type: type || 'RENT',
        method: method || 'RAZORPAY',
        status,
        paid_date: new Date().toISOString(),
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        verification_note,
      })
      .select()
      .single();

    if (error) throw error;

    // Send payment confirmation notification
    try {
      await sendNotification({
        userId: authResult.user.id,
        type: 'PAYMENT_SUCCESS',
        title: 'Payment Successful',
        message: `Your payment of ₹${amount} has been processed successfully.`,
        email: authResult.user.email,
      });
    } catch {
      // Notification failure shouldn't block payment
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    captureException(error, { endpoint: 'POST /api/payments/verify' });
    console.error('POST /api/payments/verify error:', error);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
