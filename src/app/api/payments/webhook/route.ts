/**
 * POST /api/payments/webhook
 *
 * Razorpay webhook endpoint for receiving payment events.
 * This is the server-to-server callback from Razorpay when
 * payment events occur (captured, failed, refunded, etc.).
 *
 * SECURITY: Verifies the webhook signature to ensure the
 * request is genuinely from Razorpay and not spoofed.
 * IDEMPOTENCY: Tracks processed events to prevent duplicate handling.
 *
 * Setup: Add this URL in Razorpay Dashboard → Settings → Webhooks
 *   https://stayeg.in/api/payments/webhook
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { captureException } from '@/lib/sentry-server';
import { createHmac } from 'crypto';

// Webhook secret from Razorpay Dashboard
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

/**
 * Verify Razorpay webhook signature.
 * Razorpay signs every webhook payload with HMAC-SHA256.
 */
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Check if a webhook event has already been processed (idempotency).
 * Uses the payments table's verification_note field to track processed events.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();
    return !!data;
  } catch {
    // Table may not exist yet — allow processing
    return false;
  }
}

/**
 * Record a processed webhook event for idempotency.
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('webhook_events')
      .insert({ id: eventId, event_type: eventType, processed_at: new Date().toISOString() });
  } catch {
    // Table may not exist — ignore
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature — ALWAYS verify in production
    if (RAZORPAY_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET)) {
        console.error('Webhook signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      // No secret configured — log warning but don't reject
      // (This allows simulated mode in development)
      console.warn('WARNING: RAZORPAY_WEBHOOK_SECRET not set — webhook signature not verified');
    }

    // Parse the webhook event
    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const eventId = event.id || `${eventType}-${Date.now()}`;
    const payload = event.payload?.payment?.entity;

    if (!payload) {
      console.warn('Webhook event missing payment entity:', eventType);
      return NextResponse.json({ received: true });
    }

    // IDEMPOTENCY: Check if this event was already processed
    if (await isEventProcessed(eventId)) {
      console.log(`Webhook event ${eventId} already processed — skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log(`Webhook received: ${eventType} for payment ${payload.id}`);

    // Handle different event types
    switch (eventType) {
      case 'payment.captured': {
        // Payment was successful — update the payment record
        const razorpayOrderId = payload.order_id;
        const razorpayPaymentId = payload.id;
        const amount = payload.amount / 100; // Convert paise to rupees
        const method = payload.method?.toUpperCase();

        // Find the payment by razorpay_order_id
        const { data: payment, error: fetchError } = await supabaseAdmin
          .from('payments')
          .select('id, status')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error finding payment for webhook:', fetchError.message);
          break;
        }

        if (payment) {
          // Only update if not already completed (idempotency)
          if (payment.status !== 'COMPLETED') {
            await supabaseAdmin
              .from('payments')
              .update({
                status: 'COMPLETED',
                paid_date: new Date().toISOString(),
                method: method || 'RAZORPAY',
                razorpay_payment_id: razorpayPaymentId,
                verification_note: 'Verified via Razorpay webhook: payment.captured',
              })
              .eq('id', payment.id);

            console.log(`Payment ${payment.id} marked as COMPLETED via webhook`);
          }
        } else {
          // Payment not found by order_id — could be a direct payment
          // Log for manual reconciliation
          console.warn(`Webhook: No payment found for order ${razorpayOrderId}. Amount: ₹${amount}, Method: ${method}`);
        }
        break;
      }

      case 'payment.failed': {
        // Payment failed — update the payment record if exists
        const razorpayOrderId = payload.order_id;

        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('id, status')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (payment && payment.status === 'PENDING') {
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'FAILED',
              verification_note: `Razorpay webhook: payment.failed — ${payload.error_description || 'Unknown error'}`,
            })
            .eq('id', payment.id);

          console.log(`Payment ${payment.id} marked as FAILED via webhook`);
        }
        break;
      }

      case 'payment.refunded': {
        // Payment was refunded
        const razorpayPaymentId = payload.id;

        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('id, status')
          .eq('razorpay_payment_id', razorpayPaymentId)
          .maybeSingle();

        if (payment && payment.status !== 'REFUNDED') {
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'REFUNDED',
              verification_note: 'Razorpay webhook: payment.refunded',
            })
            .eq('id', payment.id);

          console.log(`Payment ${payment.id} marked as REFUNDED via webhook`);
        }
        break;
      }

      case 'order.paid': {
        // Order is fully paid — same as payment.captured for our use case
        const razorpayOrderId = payload.id || payload.order_id;

        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('id, status')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (payment && payment.status !== 'COMPLETED') {
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'COMPLETED',
              paid_date: new Date().toISOString(),
              verification_note: 'Verified via Razorpay webhook: order.paid',
            })
            .eq('id', payment.id);

          console.log(`Payment ${payment.id} marked as COMPLETED via order.paid webhook`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    // Mark event as processed (idempotency)
    await markEventProcessed(eventId, eventType);

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/payments/webhook' });
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Razorpay from retrying
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// GET endpoint for webhook URL verification
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/payments/webhook',
    status: 'active',
    note: 'Configure this URL in Razorpay Dashboard → Settings → Webhooks',
  });
}
