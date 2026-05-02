-- ============================================================
-- StayEg RLS (Row Level Security) Policies
-- ============================================================
-- 
-- IMPORTANT: These policies are designed to work with the
-- Supabase anon key for DIRECT client-side access.
--
-- The server-side API routes use the anon key currently,
-- so applying these policies directly would break API routes.
--
-- BEFORE applying these policies, migrate all server-side API
-- routes to use the `supabaseAdmin` (service role) client.
--
-- To apply: Run this SQL in the Supabase SQL Editor.
-- ============================================================

-- ==========================================
-- 1. USERS table
-- ==========================================
-- Everyone can read public profiles (for directory/search)
-- Users can update their own profile
-- No one can delete users (admin action only via service role)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "all_users" ON users;

-- Public read (for search/directory)
CREATE POLICY "users_public_read" ON users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Users can insert their own registration
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- No delete via anon key
CREATE POLICY "users_no_delete" ON users
  FOR DELETE USING (false);

-- ==========================================
-- 2. PGS table
-- ==========================================
-- Anyone can browse approved PGs
-- Only owners can manage their own PGs

ALTER TABLE pgs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON pgs;

CREATE POLICY "pgs_public_read_approved" ON pgs
  FOR SELECT USING (status = 'APPROVED');

CREATE POLICY "pgs_owner_manage" ON pgs
  FOR ALL USING (owner_id = auth.uid()::text);

-- ==========================================
-- 3. ROOMS table
-- ==========================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON rooms;

CREATE POLICY "rooms_public_read" ON rooms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pgs WHERE pgs.id = rooms.pg_id AND pgs.status = 'APPROVED')
  );

CREATE POLICY "rooms_owner_manage" ON rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pgs WHERE pgs.id = rooms.pg_id AND pgs.owner_id = auth.uid()::text)
  );

-- ==========================================
-- 4. BEDS table
-- ==========================================

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON beds;

CREATE POLICY "beds_public_read" ON beds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rooms JOIN pgs ON pgs.id = rooms.pg_id WHERE rooms.id = beds.room_id AND pgs.status = 'APPROVED')
  );

CREATE POLICY "beds_owner_manage" ON beds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms 
      JOIN pgs ON pgs.id = rooms.pg_id 
      WHERE rooms.id = beds.room_id AND pgs.owner_id = auth.uid()::text
    )
  );

-- ==========================================
-- 5. BOOKINGS table
-- ==========================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON bookings;

-- Users can see their own bookings
CREATE POLICY "bookings_user_read_own" ON bookings
  FOR SELECT USING (user_id = auth.uid()::text);

-- PG owners can see bookings for their PGs
CREATE POLICY "bookings_owner_read" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pgs WHERE pgs.id = bookings.pg_id AND pgs.owner_id = auth.uid()::text)
  );

-- Users can create their own bookings
CREATE POLICY "bookings_user_insert" ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- No direct update/delete via anon key
CREATE POLICY "bookings_no_update" ON bookings
  FOR UPDATE USING (false);

CREATE POLICY "bookings_no_delete" ON bookings
  FOR DELETE USING (false);

-- ==========================================
-- 6. PAYMENTS table
-- ==========================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON payments;

CREATE POLICY "payments_user_read_own" ON payments
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "payments_owner_read" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pgs WHERE pgs.id = payments.pg_id AND pgs.owner_id = auth.uid()::text)
  );

CREATE POLICY "payments_no_insert" ON payments
  FOR INSERT WITH CHECK (false);

CREATE POLICY "payments_no_update" ON payments
  FOR UPDATE USING (false);

CREATE POLICY "payments_no_delete" ON payments
  FOR DELETE USING (false);

-- ==========================================
-- 7. COMPLAINTS table
-- ==========================================

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON complaints;

CREATE POLICY "complaints_user_read_own" ON complaints
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "complaints_owner_read" ON complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pgs WHERE pgs.id = complaints.pg_id AND pgs.owner_id = auth.uid()::text)
  );

CREATE POLICY "complaints_user_insert" ON complaints
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "complaints_no_update" ON complaints
  FOR UPDATE USING (false);

CREATE POLICY "complaints_no_delete" ON complaints
  FOR DELETE USING (false);

-- ==========================================
-- 8. VENDORS table (public directory)
-- ==========================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON vendors;

CREATE POLICY "vendors_public_read" ON vendors
  FOR SELECT USING (true);

CREATE POLICY "vendors_no_insert" ON vendors
  FOR INSERT WITH CHECK (false);

CREATE POLICY "vendors_no_update" ON vendors
  FOR UPDATE USING (false);

CREATE POLICY "vendors_no_delete" ON vendors
  FOR DELETE USING (false);

-- ==========================================
-- 9. WORKERS table (internal)
-- ==========================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON workers;

CREATE POLICY "workers_no_access" ON workers
  FOR ALL USING (false);

-- ==========================================
-- 10. TENANT_NOTES table
-- ==========================================

ALTER TABLE tenant_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON tenant_notes;

CREATE POLICY "tenant_notes_user_read_own" ON tenant_notes
  FOR SELECT USING (tenant_id = auth.uid()::text);

CREATE POLICY "tenant_notes_owner_read" ON tenant_notes
  FOR SELECT USING (owner_id = auth.uid()::text);

CREATE POLICY "tenant_notes_no_insert" ON tenant_notes
  FOR INSERT WITH CHECK (false);

CREATE POLICY "tenant_notes_no_update" ON tenant_notes
  FOR UPDATE USING (false);

CREATE POLICY "tenant_notes_no_delete" ON tenant_notes
  FOR DELETE USING (false);

-- ==========================================
-- 11. ACTIVITY_LOG table
-- ==========================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON activity_log;

CREATE POLICY "activity_log_no_access" ON activity_log
  FOR ALL USING (false);

-- ==========================================
-- 12. REPORTS table
-- ==========================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON reports;

CREATE POLICY "reports_user_read_own" ON reports
  FOR SELECT USING (reporter_id = auth.uid()::text);

CREATE POLICY "reports_user_insert" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid()::text);

CREATE POLICY "reports_no_update" ON reports
  FOR UPDATE USING (false);

CREATE POLICY "reports_no_delete" ON reports
  FOR DELETE USING (false);

-- ==========================================
-- 13. CONTACT_SUBMISSIONS table
-- ==========================================

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users" ON contact_submissions;

CREATE POLICY "contact_public_insert" ON contact_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "contact_no_read" ON contact_submissions
  FOR SELECT USING (false);

CREATE POLICY "contact_no_update" ON contact_submissions
  FOR UPDATE USING (false);

CREATE POLICY "contact_no_delete" ON contact_submissions
  FOR DELETE USING (false);
