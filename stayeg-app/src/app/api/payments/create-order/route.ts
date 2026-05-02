/**
 * POST /api/payments/create-order
 *
 * Creates a RazorPay order for a payment.
 * Requires authenticated session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createOrder, getKeyId } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { amount, pgId, bookingId, type } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const receipt = `rcpt_${authResult.user.id}_${Date.now()}`;

    const order = await createOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        userId: authResult.user.id,
        pgId: pgId || '',
        bookingId: bookingId || '',
        type: type || 'RENT',
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getKeyId(),
      simulated: (order as any).simulated || false,
      user: {
        name: authResult.user.name,
        email: authResult.user.email,
      },
    });
  } catch (error: any) {
    console.error('POST /api/payments/create-order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
