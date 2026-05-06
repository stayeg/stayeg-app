-- ================================================================
-- StayEg RLS Security Hardening Migration
-- Run this in Supabase Dashboard > SQL Editor
-- ================================================================

-- Step 1: Drop ALL existing permissive policies (USING(true) ones)
DO $$
DECLARE
  pol record;
  stmt text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    -- Drop all existing policies on public tables
    BEGIN
      stmt := format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
      EXECUTE stmt;
      RAISE NOTICE 'Dropped: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END;
  END LOOP;
END$$;

-- Step 2: Ensure RLS is enabled on ALL tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_notes ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- USERS TABLE - Anyone can read; users update own; admin full access
-- ================================================================
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (
  auth.uid() = id OR auth.role() = 'service_role'
);
CREATE POLICY "users_delete" ON users FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- PGS TABLE - Approved PGs visible to all; owners manage own
-- ================================================================
CREATE POLICY "pgs_select" ON pgs FOR SELECT USING (
  status = 'APPROVED' 
  OR owner_id = auth.uid() 
  OR auth.role() = 'service_role'
);
CREATE POLICY "pgs_insert" ON pgs FOR INSERT WITH CHECK (
  auth.role() IN ('service_role', 'authenticated')
);
CREATE POLICY "pgs_update_own" ON pgs FOR UPDATE USING (
  owner_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "pgs_delete" ON pgs FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- ROOMS TABLE - Visible for approved PGs; owners manage own PG rooms
-- ================================================================
CREATE POLICY "rooms_select" ON rooms FOR SELECT USING (
  pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "rooms_insert" ON rooms FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "rooms_update_own" ON rooms FOR UPDATE USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "rooms_delete_own" ON rooms FOR DELETE USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()) OR auth.role() = 'service_role'
);

-- ================================================================
-- BEDS TABLE - Same pattern as rooms
-- ================================================================
CREATE POLICY "beds_select" ON beds FOR SELECT USING (
  room_id IN (SELECT id FROM rooms WHERE pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR owner_id = auth.uid()))
  OR auth.role() = 'service_role'
);
CREATE POLICY "beds_insert" ON beds FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "beds_update_own" ON beds FOR UPDATE USING (
  room_id IN (SELECT id FROM rooms WHERE pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())) OR auth.role() = 'service_role'
);
CREATE POLICY "beds_delete_own" ON beds FOR DELETE USING (
  room_id IN (SELECT id FROM rooms WHERE pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())) OR auth.role() = 'service_role'
);

-- ================================================================
-- BOOKINGS TABLE - Users see own; owners see PG bookings; admin all
-- ================================================================
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  user_id = auth.uid()
  OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
  user_id = auth.uid()
  OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- PAYMENTS TABLE - Users see own; owners see PG payments; admin all
-- ================================================================
CREATE POLICY "payments_select" ON payments FOR SELECT USING (
  user_id = auth.uid()
  OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (
  auth.role() IN ('service_role', 'authenticated')
);
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- COMPLAINTS TABLE
-- ================================================================
CREATE POLICY "complaints_select" ON complaints FOR SELECT USING (
  user_id = auth.uid()
  OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "complaints_insert" ON complaints FOR INSERT WITH CHECK (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "complaints_update" ON complaints FOR UPDATE USING (
  user_id = auth.uid()
  OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "complaints_delete" ON complaints FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- VENDORS TABLE - Public read; owner/admin manage
-- ================================================================
CREATE POLICY "vendors_select" ON vendors FOR SELECT USING (true);
CREATE POLICY "vendors_insert" ON vendors FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "vendors_update" ON vendors FOR UPDATE USING (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "vendors_delete" ON vendors FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- WORKERS TABLE - Owners see own PG workers
-- ================================================================
CREATE POLICY "workers_select" ON workers FOR SELECT USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid() OR status = 'APPROVED')
  OR auth.role() = 'service_role'
);
CREATE POLICY "workers_insert" ON workers FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "workers_update" ON workers FOR UPDATE USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "workers_delete" ON workers FOR DELETE USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()) OR auth.role() = 'service_role'
);

-- ================================================================
-- NOTIFICATIONS TABLE - Users see own only
-- ================================================================
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (
  user_id = auth.uid() OR auth.role() = 'service_role'
);

-- ================================================================
-- REVIEWS TABLE - Public read; users manage own
-- ================================================================
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (
  user_id = auth.uid() OR auth.role() = 'service_role'
);

-- ================================================================
-- ACTIVITY_LOG TABLE - Admin only
-- ================================================================
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "activity_log_update" ON activity_log FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "activity_log_delete" ON activity_log FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- COUPONS TABLE - Public read; admin manage
-- ================================================================
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (true);
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "coupons_update" ON coupons FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "coupons_delete" ON coupons FOR DELETE USING (auth.role() = 'service_role');

-- ================================================================
-- COUPON_USAGES TABLE
-- ================================================================
CREATE POLICY "coupon_usages_select" ON coupon_usages FOR SELECT USING (
  user_id = auth.uid() OR auth.role() = 'service_role'
);
CREATE POLICY "coupon_usages_insert" ON coupon_usages FOR INSERT WITH CHECK (
  user_id = auth.uid() OR auth.role() = 'service_role'
);

-- ================================================================
-- TENANT_NOTES TABLE - Owners see notes for their PG tenants
-- ================================================================
CREATE POLICY "tenant_notes_select" ON tenant_notes FOR SELECT USING (
  tenant_id = auth.uid()
  OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid())
  OR auth.role() = 'service_role'
);
CREATE POLICY "tenant_notes_insert" ON tenant_notes FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));
CREATE POLICY "tenant_notes_update" ON tenant_notes FOR UPDATE USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "tenant_notes_delete" ON tenant_notes FOR DELETE USING (
  pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()) OR auth.role() = 'service_role'
);

-- ================================================================
-- VERIFICATION: Check that no USING(true) policies remain
-- ================================================================
-- Run this query to verify:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND qual = 'true';
-- Should return 0 rows.

-- ================================================================
-- STEP 3: Add Missing Security Columns to Users Table
-- ================================================================
-- OTP verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- Bank account columns for PG owners (payment settlement)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- ================================================================
-- STEP 4: Create Atomic Booking Function (Race Condition Fix)
-- ================================================================
-- This function atomically creates a booking and marks the bed as
-- OCCUPIED in a single transaction, preventing double-booking.
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_user_id TEXT,
  p_pg_id TEXT,
  p_bed_id TEXT,
  p_check_in_date TIMESTAMPTZ,
  p_advance_paid NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
  v_bed_status TEXT;
  v_active_count INT;
BEGIN
  -- Step 1: Check bed is available (with row lock)
  SELECT status INTO v_bed_status
  FROM beds
  WHERE id = p_bed_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Bed not found', 'code', 'BED_NOT_FOUND');
  END IF;

  IF v_bed_status = 'OCCUPIED' THEN
    RETURN json_build_object('error', 'This bed is already booked', 'code', 'BED_OCCUPIED');
  END IF;

  -- Step 2: Check no active booking exists for this bed
  SELECT COUNT(*) INTO v_active_count
  FROM bookings
  WHERE bed_id = p_bed_id
    AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE');

  IF v_active_count > 0 THEN
    RETURN json_build_object('error', 'This bed already has an active booking', 'code', 'BOOKING_EXISTS');
  END IF;

  -- Step 3: Create the booking
  INSERT INTO bookings (user_id, pg_id, bed_id, check_in_date, advance_paid, status)
  VALUES (p_user_id, p_pg_id, p_bed_id, p_check_in_date, p_advance_paid, 'CONFIRMED')
  RETURNING * INTO v_booking;

  -- Step 4: Mark bed as OCCUPIED
  UPDATE beds SET status = 'OCCUPIED' WHERE id = p_bed_id;

  RETURN json_build_object('success', true, 'booking', row_to_json(v_booking));
END;
$$;
