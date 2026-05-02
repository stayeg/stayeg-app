/**
 * RazorPay payment utility for StayEg.
 * Uses RazorPay SDK for order creation and payment verification.
 * Falls back to simulated mode if RAZORPAY_KEY_ID is not configured.
 */

import Razorpay from 'razorpay';

type RazorpayInstance = InstanceType<typeof Razorpay>;

let razorpayInstance: RazorpayInstance | null = null;

function getRazorpayInstance(): RazorpayInstance | null {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return null;

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

/**
 * Create a RazorPay order for a payment.
 */
export async function createOrder(params: {
  amount: number; // in rupees
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const instance = getRazorpayInstance();

  if (!instance) {
    // Simulated mode — return a mock order
    const mockOrderId = `order_mock_${Date.now()}`;
    return {
      id: mockOrderId,
      amount: params.amount * 100, // Convert to paise
      currency: params.currency || 'INR',
      receipt: params.receipt,
      status: 'created',
      simulated: true,
    };
  }

  const order = await instance.orders.create({
    amount: params.amount * 100, // RazorPay expects amount in paise
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes,
  });

  return order;
}

/**
 * Verify a RazorPay payment signature.
 */
export async function verifyPayment(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    // Simulated mode — always return true
    return true;
  }

  const crypto = await import('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  return expectedSignature === params.signature;
}

/**
 * Get the RazorPay key ID (for frontend integration).
 */
export function getKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID || null;
}
