-- =============================================================
-- StayEg — Phase 2 Security Migration
-- =============================================================
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- This applies:
--   1. Proper RLS policies (replaces USING(true) placeholders)
--   2. Atomic booking RPC function (prevents race conditions)
--   3. Bank account columns for PG owners
--   4. Payment verification columns
-- =============================================================

-- =============================================================
-- PART 1: Drop old RLS policies and create proper ones
-- =============================================================

-- Drop ALL existing policies on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- Enable RLS on all tables (idempotent)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- ─── USERS ────────────────────────────────────────────────
-- Public: anyone can read basic user profiles (reviewer names, tenant info)
CREATE POLICY "users_select_public" ON users FOR SELECT USING (true);
-- Writes: service_role only (API routes use service_role key, which bypasses RLS)
CREATE POLICY "users_insert_service" ON users FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "users_update_service" ON users FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "users_delete_service" ON users FOR DELETE USING (auth.role() = 'service_role');

-- ─── PGS ──────────────────────────────────────────────────
-- Public: anyone can browse PG listings
CREATE POLICY "pgs_select_public" ON pgs FOR SELECT USING (true);
CREATE POLICY "pgs_insert_service" ON pgs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "pgs_update_service" ON pgs FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "pgs_delete_service" ON pgs FOR DELETE USING (auth.role() = 'service_role');

-- ─── ROOMS ────────────────────────────────────────────────
-- Public: anyone can browse rooms (part of PG listing)
CREATE POLICY "rooms_select_public" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_service" ON rooms FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rooms_update_service" ON rooms FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "rooms_delete_service" ON rooms FOR DELETE USING (auth.role() = 'service_role');

-- ─── BEDS ─────────────────────────────────────────────────
-- Public: anyone can see bed availability
CREATE POLICY "beds_select_public" ON beds FOR SELECT USING (true);
CREATE POLICY "beds_insert_service" ON beds FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "beds_update_service" ON beds FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "beds_delete_service" ON beds FOR DELETE USING (auth.role() = 'service_role');

-- ─── BOOKINGS ─────────────────────────────────────────────
-- Sensitive: service_role only (via API routes)
CREATE POLICY "bookings_select_service" ON bookings FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "bookings_insert_service" ON bookings FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "bookings_update_service" ON bookings FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "bookings_delete_service" ON bookings FOR DELETE USING (auth.role() = 'service_role');

-- ─── PAYMENTS ─────────────────────────────────────────────
-- Sensitive: service_role only
CREATE POLICY "payments_select_service" ON payments FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "payments_insert_service" ON payments FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "payments_update_service" ON payments FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "payments_delete_service" ON payments FOR DELETE USING (auth.role() = 'service_role');

-- ─── COMPLAINTS ───────────────────────────────────────────
-- Sensitive: service_role only
CREATE POLICY "complaints_select_service" ON complaints FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "complaints_insert_service" ON complaints FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "complaints_update_service" ON complaints FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "complaints_delete_service" ON complaints FOR DELETE USING (auth.role() = 'service_role');

-- ─── VENDORS ──────────────────────────────────────────────
-- Public: vendor directory is browseable
CREATE POLICY "vendors_select_public" ON vendors FOR SELECT USING (true);
CREATE POLICY "vendors_insert_service" ON vendors FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "vendors_update_service" ON vendors FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "vendors_delete_service" ON vendors FOR DELETE USING (auth.role() = 'service_role');

-- ─── WORKERS ──────────────────────────────────────────────
-- Sensitive: service_role only
CREATE POLICY "workers_select_service" ON workers FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "workers_insert_service" ON workers FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "workers_update_service" ON workers FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "workers_delete_service" ON workers FOR DELETE USING (auth.role() = 'service_role');

-- ─── TENANT NOTES ─────────────────────────────────────────
-- Sensitive: service_role only
CREATE POLICY "tenant_notes_select_service" ON tenant_notes FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "tenant_notes_insert_service" ON tenant_notes FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "tenant_notes_update_service" ON tenant_notes FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "tenant_notes_delete_service" ON tenant_notes FOR DELETE USING (auth.role() = 'service_role');

-- ─── ACTIVITY LOG ─────────────────────────────────────────
-- Sensitive: service_role only (insert-only, no update/delete needed)
CREATE POLICY "activity_log_select_service" ON activity_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "activity_log_insert_service" ON activity_log FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─── REVIEWS ──────────────────────────────────────────────
-- Public: anyone can read reviews (shown on PG pages)
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_service" ON reviews FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "reviews_update_service" ON reviews FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "reviews_delete_service" ON reviews FOR DELETE USING (auth.role() = 'service_role');

-- ─── NOTIFICATIONS ────────────────────────────────────────
-- Sensitive: service_role only
CREATE POLICY "notifications_select_service" ON notifications FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "notifications_update_service" ON notifications FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "notifications_delete_service" ON notifications FOR DELETE USING (auth.role() = 'service_role');

-- ─── COUPONS ──────────────────────────────────────────────
-- Sensitive: service_role only
CREATE POLICY "coupons_select_service" ON coupons FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "coupons_insert_service" ON coupons FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "coupons_update_service" ON coupons FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "coupons_delete_service" ON coupons FOR DELETE USING (auth.role() = 'service_role');

-- ─── COUPON USAGES ────────────────────────────────────────
-- Sensitive: service_role only (insert-only)
CREATE POLICY "coupon_usages_select_service" ON coupon_usages FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "coupon_usages_insert_service" ON coupon_usages FOR INSERT WITH CHECK (auth.role() = 'service_role');


-- =============================================================
-- PART 2: Atomic Booking RPC Function
-- =============================================================
-- This prevents race conditions where two users could book
-- the same bed simultaneously. The function uses row-level
-- locking (FOR UPDATE) within a single DB transaction.

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_user_id TEXT,
  p_pg_id TEXT,
  p_bed_id TEXT,
  p_check_in_date TIMESTAMPTZ,
  p_advance_paid DOUBLE PRECISION DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_bed_status TEXT;
  v_existing_booking_id TEXT;
  v_booking_id TEXT;
BEGIN
  -- Lock the bed row and check availability
  SELECT status INTO v_bed_status
  FROM beds
  WHERE id = p_bed_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Bed not found',
      'code', 'BED_NOT_FOUND'
    );
  END IF;

  IF v_bed_status != 'AVAILABLE' THEN
    RETURN jsonb_build_object(
      'error', 'This bed is already booked. Please select another bed.',
      'code', 'BED_OCCUPIED'
    );
  END IF;

  -- Check for existing active booking on this bed
  SELECT id INTO v_existing_booking_id
  FROM bookings
  WHERE bed_id = p_bed_id
    AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
  FOR UPDATE;

  IF v_existing_booking_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'error', 'This bed already has an active booking.',
      'code', 'BOOKING_EXISTS'
    );
  END IF;

  -- Create the booking
  INSERT INTO bookings (user_id, pg_id, bed_id, check_in_date, advance_paid, status)
  VALUES (p_user_id, p_pg_id, p_bed_id, p_check_in_date, p_advance_paid, 'PENDING')
  RETURNING id INTO v_booking_id;

  -- Mark bed as OCCUPIED
  UPDATE beds SET status = 'OCCUPIED' WHERE id = p_bed_id;

  RETURN jsonb_build_object(
    'booking', jsonb_build_object(
      'id', v_booking_id,
      'user_id', p_user_id,
      'pg_id', p_pg_id,
      'bed_id', p_bed_id,
      'status', 'PENDING'
    )
  );
END;
$$;


-- =============================================================
-- PART 3: Bank Account Columns for PG Owners
-- =============================================================
-- PG owners can add their bank account details so that
-- tenant payments are directly credited to their accounts.

-- Add bank account columns to pgs table (idempotent)
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS upi_id TEXT;


-- =============================================================
-- PART 4: Payment Verification Columns
-- =============================================================
-- These columns support the Razorpay payment verification flow

ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_note TEXT;


-- =============================================================
-- VERIFICATION: List current policies on each table
-- =============================================================
-- Run this query separately to verify policies were applied correctly:
--
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
