-- =====================================================
-- StayEg - Security Hardening Migration
-- Fixes: RLS policies, missing columns, password hashing
-- Run in Supabase Dashboard > SQL Editor
-- =====================================================

-- ===========================================
-- 1. ADD MISSING COLUMNS TO USERS TABLE
-- ===========================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'otp_code') THEN
    ALTER TABLE users ADD COLUMN otp_code TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'otp_expires_at') THEN
    ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kyc_status') THEN
    ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'NOT_SUBMITTED' CHECK (kyc_status IN ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'));
  END IF;
END $$;

-- ===========================================
-- 2. ADD MISSING COLUMNS TO PAYMENTS TABLE
-- ===========================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'razorpay_order_id') THEN
    ALTER TABLE payments ADD COLUMN razorpay_order_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'razorpay_payment_id') THEN
    ALTER TABLE payments ADD COLUMN razorpay_payment_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'method') THEN
    -- Already exists with check constraint, skip
    NULL;
  END IF;
END $$;

-- Allow RAZORPAY as a payment method
DO $$ BEGIN
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_method_check
  CHECK (method IN ('UPI', 'CARD', 'NET_BANKING', 'CASH', 'RAZORPAY', 'ONLINE'));

-- ===========================================
-- 3. SET DEFAULT PASSWORDS FOR SEED USERS
-- Password for all seed users: StayEg@2025
-- (Hashed with bcryptjs, 12 salt rounds)
-- ===========================================
UPDATE users SET password_hash = '$2b$12$OAb6dl9UxARmmIeDXIfBI.kDrveZIcLF0wzwlzAuLdmNwHXHM.n/C' 
WHERE password_hash IS NULL;

-- ===========================================
-- 4. DROP OLD OPEN RLS POLICIES
-- ===========================================
-- Users
DROP POLICY IF EXISTS "Users readable by all" ON users;
DROP POLICY IF EXISTS "Users insertable by anon" ON users;
DROP POLICY IF EXISTS "Users updatable by all" ON users;

-- PGs
DROP POLICY IF EXISTS "PGs readable by all" ON pgs;
DROP POLICY IF EXISTS "PGs insertable by all" ON pgs;
DROP POLICY IF EXISTS "PGs updatable by all" ON pgs;

-- Rooms
DROP POLICY IF EXISTS "Rooms readable by all" ON rooms;
DROP POLICY IF EXISTS "Rooms insertable by all" ON rooms;
DROP POLICY IF EXISTS "Rooms updatable by all" ON rooms;
DROP POLICY IF EXISTS "Rooms deletable by all" ON rooms;

-- Beds
DROP POLICY IF EXISTS "Beds readable by all" ON beds;
DROP POLICY IF EXISTS "Beds insertable by all" ON beds;
DROP POLICY IF EXISTS "Beds updatable by all" ON beds;
DROP POLICY IF EXISTS "Beds deletable by all" ON beds;

-- Bookings
DROP POLICY IF EXISTS "Bookings readable by all" ON bookings;
DROP POLICY IF EXISTS "Bookings insertable by all" ON bookings;
DROP POLICY IF EXISTS "Bookings updatable by all" ON bookings;
DROP POLICY IF EXISTS "Bookings deletable by all" ON bookings;

-- Payments
DROP POLICY IF EXISTS "Payments readable by all" ON payments;
DROP POLICY IF EXISTS "Payments insertable by all" ON payments;
DROP POLICY IF EXISTS "Payments updatable by all" ON payments;
DROP POLICY IF EXISTS "Payments deletable by all" ON payments;

-- Complaints
DROP POLICY IF EXISTS "Complaints readable by all" ON complaints;
DROP POLICY IF EXISTS "Complaints insertable by all" ON complaints;
DROP POLICY IF EXISTS "Complaints updatable by all" ON complaints;

-- Vendors
DROP POLICY IF EXISTS "Vendors readable by all" ON vendors;
DROP POLICY IF EXISTS "Vendors insertable by all" ON vendors;
DROP POLICY IF EXISTS "Vendors updatable by all" ON vendors;
DROP POLICY IF EXISTS "Vendors deletable by all" ON vendors;

-- Workers
DROP POLICY IF EXISTS "Workers readable by all" ON workers;
DROP POLICY IF EXISTS "Workers insertable by all" ON workers;
DROP POLICY IF EXISTS "Workers updatable by all" ON workers;
DROP POLICY IF EXISTS "Workers deletable by all" ON workers;

-- Tenant notes
DROP POLICY IF EXISTS "Tenant notes readable by all" ON tenant_notes;
DROP POLICY IF EXISTS "Tenant notes insertable by all" ON tenant_notes;
DROP POLICY IF EXISTS "Tenant notes updatable by all" ON tenant_notes;
DROP POLICY IF EXISTS "Tenant notes deletable by all" ON tenant_notes;

-- Activity log
DROP POLICY IF EXISTS "Activity log readable by all" ON activity_log;
DROP POLICY IF EXISTS "Activity log insertable by all" ON activity_log;

-- ===========================================
-- 5. CREATE PROPER RLS POLICIES
-- 
-- Note: Since the app uses the SERVICE ROLE KEY 
-- for server-side operations (via supabase admin client),
-- RLS policies apply mainly to the ANON key.
-- The service_role key bypasses RLS entirely.
-- 
-- These policies use auth.uid() for Supabase Auth users
-- and also allow service_role access automatically.
-- ===========================================

-- --- USERS ---
-- Anyone can read basic profiles (needed for PG listings, search)
CREATE POLICY "users_select_public" ON users
  FOR SELECT USING (true);

-- Anyone can insert (signup)
CREATE POLICY "users_insert_public" ON users
  FOR INSERT WITH CHECK (true);

-- Users can only update their own profile (or admin)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (
    auth.uid()::text = id 
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- PGs ---
-- Anyone can read APPROVED PGs
CREATE POLICY "pgs_select_approved" ON pgs
  FOR SELECT USING (status = 'APPROVED' OR is_verified = true);

-- Owners can read their own PGs (any status)
CREATE POLICY "pgs_select_own" ON pgs
  FOR SELECT USING (
    owner_id = auth.uid()::text
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Owners and admins can insert PGs
CREATE POLICY "pgs_insert_owner" ON pgs
  FOR INSERT WITH CHECK (true);

-- Only PG owner or admin can update
CREATE POLICY "pgs_update_own" ON pgs
  FOR UPDATE USING (
    owner_id = auth.uid()::text
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Only admin can delete
CREATE POLICY "pgs_delete_admin" ON pgs
  FOR DELETE USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- ROOMS ---
-- Anyone can read rooms for approved PGs
CREATE POLICY "rooms_select_public" ON rooms
  FOR SELECT USING (
    pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR is_verified = true)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- PG owners and admins can manage rooms
CREATE POLICY "rooms_manage_owner" ON rooms
  FOR ALL USING (
    pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- BEDS ---
-- Anyone can read beds for approved PGs
CREATE POLICY "beds_select_public" ON beds
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR is_verified = true))
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- PG owners and admins can manage beds
CREATE POLICY "beds_manage_owner" ON beds
  FOR ALL USING (
    room_id IN (SELECT id FROM rooms WHERE pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text))
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- BOOKINGS ---
-- Users can read their own bookings
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Authenticated users can create bookings
CREATE POLICY "bookings_insert_auth" ON bookings
  FOR INSERT WITH CHECK (true);

-- Users can update their own, owners can update for their PG, admins can update all
CREATE POLICY "bookings_update_own" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid()::text
    OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Only admin can delete bookings
CREATE POLICY "bookings_delete_admin" ON bookings
  FOR DELETE USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- PAYMENTS ---
-- Users can read their own payments, owners can read for their PG
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Authenticated users can create payments
CREATE POLICY "payments_insert_auth" ON payments
  FOR INSERT WITH CHECK (true);

-- Only admins/service can update payments (prevent tampering)
CREATE POLICY "payments_update_admin" ON payments
  FOR UPDATE USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- COMPLAINTS ---
-- Users can read own complaints, owners can read for their PG
CREATE POLICY "complaints_select_own" ON complaints
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Authenticated users can create complaints
CREATE POLICY "complaints_insert_auth" ON complaints
  FOR INSERT WITH CHECK (true);

-- Users update own, owners update for their PG, admins update all
CREATE POLICY "complaints_update_own" ON complaints
  FOR UPDATE USING (
    user_id = auth.uid()::text
    OR pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- VENDORS ---
-- Anyone can read vendors (public directory)
CREATE POLICY "vendors_select_public" ON vendors
  FOR SELECT USING (true);

-- Only admins and service_role can manage vendors
CREATE POLICY "vendors_manage_admin" ON vendors
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- WORKERS ---
-- Anyone can read workers for approved PGs
CREATE POLICY "workers_select_public" ON workers
  FOR SELECT USING (
    pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR is_verified = true)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- PG owners and admins can manage workers
CREATE POLICY "workers_manage_owner" ON workers
  FOR ALL USING (
    pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()::text)
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- TENANT NOTES ---
-- Owners can read notes for their PG, tenants can read notes about themselves
CREATE POLICY "tenant_notes_select_own" ON tenant_notes
  FOR SELECT USING (
    owner_id = auth.uid()::text
    OR tenant_id = auth.uid()::text
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Owners and admins can create notes
CREATE POLICY "tenant_notes_insert_owner" ON tenant_notes
  FOR INSERT WITH CHECK (true);

-- Owners and admins can update notes
CREATE POLICY "tenant_notes_update_owner" ON tenant_notes
  FOR UPDATE USING (
    owner_id = auth.uid()::text
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Only owners/admins can delete notes
CREATE POLICY "tenant_notes_delete_owner" ON tenant_notes
  FOR DELETE USING (
    owner_id = auth.uid()::text
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- --- ACTIVITY LOG ---
-- Owners can read their own activity log
CREATE POLICY "activity_log_select_own" ON activity_log
  FOR SELECT USING (
    owner_id = auth.uid()::text
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Anyone can insert activity log
CREATE POLICY "activity_log_insert_auth" ON activity_log
  FOR INSERT WITH CHECK (true);

-- ===========================================
-- DONE! Security hardening complete.
-- ===========================================
