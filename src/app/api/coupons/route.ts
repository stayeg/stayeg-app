/**
 * Coupon API — StayEg v1.2
 *
 * GET  /api/coupons?code=xxx    — Validate a coupon code
 * GET  /api/coupons              — List active coupons
 * POST /api/coupons             — Apply coupon to booking (track usage)
 */

import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

// GET /api/coupons — List active coupons or validate a code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Validate a specific coupon code
    if (code) {
      const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        return NextResponse.json(
          { valid: false, error: 'Invalid or expired coupon code' },
          { status: 404 }
        );
      }

      // Check expiry
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon has expired',
          coupon: { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value },
        });
      }

      // Check usage limit
      if (coupon.used_count >= coupon.usage_limit) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon has reached its usage limit',
          coupon: { code: coupon.code },
        });
      }

      return NextResponse.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          min_order_amount: Number(coupon.min_order_amount),
          max_discount: Number(coupon.max_discount),
          valid_until: coupon.valid_until,
        },
      });
    }

    // List all active coupons
    const { data: coupons, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/coupons error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }

    return NextResponse.json(
      (coupons || []).map((c) => ({
        id: c.id,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        min_order_amount: Number(c.min_order_amount),
        max_discount: Number(c.max_discount),
        usage_limit: c.usage_limit,
        used_count: c.used_count,
        valid_from: c.valid_from,
        valid_until: c.valid_until,
        is_active: c.is_active,
      }))
    );
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/coupons' });
    console.error('GET /api/coupons error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

// POST /api/coupons — Apply coupon (track usage)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { couponId, bookingId, amount } = body;

    if (!couponId || !amount) {
      return NextResponse.json({ error: 'couponId and amount required' }, { status: 400 });
    }

    // Fetch coupon
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Check expiry
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    // Check min order amount
    if (coupon.min_order_amount && amount < coupon.min_order_amount) {
      return NextResponse.json(
        { error: `Minimum order amount is ₹${coupon.min_order_amount}` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discountAmount = (amount * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    } else {
      discountAmount = Math.min(Number(coupon.discount_value), amount);
    }

    // Track usage
    const { error: usageError } = await supabaseAdmin.from('coupon_usages').insert({
      coupon_id: couponId,
      user_id: authResult.user.id,
      booking_id: bookingId || null,
      discount_amount: discountAmount,
    });

    if (usageError) {
      if (usageError.code === '23505') {
        return NextResponse.json({ error: 'You have already used this coupon' }, { status: 409 });
      }
      console.error('POST /api/coupons usage error:', usageError.message);
      return NextResponse.json({ error: 'Failed to apply coupon' }, { status: 500 });
    }

    // Increment used_count
    await supabaseAdmin
      .from('coupons')
      .update({ used_count: coupon.used_count + 1 })
      .eq('id', couponId);

    return NextResponse.json({
      success: true,
      discount_amount: Math.round(discountAmount * 100) / 100,
      final_amount: Math.round((amount - discountAmount) * 100) / 100,
    });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/coupons' });
    console.error('POST /api/coupons error:', error);
    return NextResponse.json({ error: 'Failed to apply coupon' }, { status: 500 });
  }
}
