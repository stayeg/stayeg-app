-- =============================================================
-- StayEg v1.2 — COMPLETE DATABASE SETUP (SINGLE FILE)
-- =============================================================
-- HOW TO USE THIS:
-- 1. Go to: https://supabase.com/dashboard/project/rgkbkdxfekslaygvjngm/sql
-- 2. Click "New Query" button
-- 3. Copy EVERYTHING below this comment block (from "CREATE EXTENSION" onwards)
-- 4. Paste into the SQL Editor
-- 5. Click the green "Run" button (or press Ctrl+Enter)
-- 6. Wait for "Success" message
-- =============================================================

-- STEP 0: Clean up any old tables (safe — IF EXISTS)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS tenant_notes CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS pgs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- STEP 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: Create all tables

-- 2.1 USERS
CREATE TABLE users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'TENANT' CHECK (role IN ('TENANT', 'OWNER', 'ADMIN', 'VENDOR')),
  avatar      TEXT,
  gender      TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  kyc_doc     TEXT,
  bio         TEXT,
  city        TEXT,
  age         INTEGER,
  occupation  TEXT,
  aadhaar_number TEXT,
  pan_number  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 PGs
CREATE TABLE pgs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  owner_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description      TEXT,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL DEFAULT 'Bangalore',
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  gender           TEXT NOT NULL DEFAULT 'UNISEX' CHECK (gender IN ('MALE', 'FEMALE', 'UNISEX')),
  price            DOUBLE PRECISION NOT NULL DEFAULT 0,
  security_deposit DOUBLE PRECISION DEFAULT 0,
  amenities        TEXT DEFAULT '',
  images           TEXT DEFAULT '',
  rating           DOUBLE PRECISION DEFAULT 4.0,
  total_reviews    INTEGER DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_verified      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 ROOMS
CREATE TABLE rooms (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pg_id            TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  room_code        TEXT NOT NULL,
  room_type        TEXT NOT NULL DEFAULT 'SHARED' CHECK (room_type IN ('SINGLE', 'SHARED', 'DOUBLE', 'TRIPLE', 'DORMITORY')),
  floor            INTEGER DEFAULT 1,
  has_ac           BOOLEAN DEFAULT FALSE,
  has_attached_bath BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 BEDS
CREATE TABLE beds (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED')),
  price      DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 BOOKINGS
CREATE TABLE bookings (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id         TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  bed_id        TEXT NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  check_in_date TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  advance_paid  DOUBLE PRECISION DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 PAYMENTS
CREATE TABLE payments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  booking_id  TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  amount      DOUBLE PRECISION NOT NULL,
  type        TEXT NOT NULL DEFAULT 'RENT' CHECK (type IN ('RENT', 'ADVANCE', 'SECURITY_DEPOSIT', 'DEPOSIT', 'MAINTENANCE', 'PENALTY', 'REFUND')),
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  due_date    TIMESTAMPTZ,
  paid_date   TIMESTAMPTZ,
  method      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 COMPLAINTS
CREATE TABLE complaints (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'FOOD', 'GENERAL', 'OTHER')),
  priority    TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to TEXT,
  resolution  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 VENDORS
CREATE TABLE vendors (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('PLUMBER', 'ELECTRICIAN', 'CLEANER', 'PAINTER', 'CARPENTER', 'WIFI', 'GENERAL')),
  phone      TEXT NOT NULL,
  email      TEXT,
  city       TEXT DEFAULT 'Bangalore',
  area       TEXT,
  rating     DOUBLE PRECISION DEFAULT 4.0,
  status     TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 WORKERS
CREATE TABLE workers (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('SECURITY', 'CLEANER', 'COOK', 'MANAGER', 'MAINTENANCE')),
  phone      TEXT NOT NULL,
  pg_id      TEXT REFERENCES pgs(id) ON DELETE SET NULL,
  shift      TEXT CHECK (shift IN ('MORNING', 'EVENING', 'NIGHT')),
  status     TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 TENANT NOTES
CREATE TABLE tenant_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  pg_id TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 ACTIVITY LOG
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id TEXT REFERENCES pgs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_role_approved ON users(role, is_approved);
CREATE INDEX idx_pgs_owner ON pgs(owner_id);
CREATE INDEX idx_pgs_city ON pgs(city);
CREATE INDEX idx_pgs_gender ON pgs(gender);
CREATE INDEX idx_pgs_status ON pgs(status);
CREATE INDEX idx_rooms_pg ON rooms(pg_id);
CREATE UNIQUE INDEX idx_rooms_pg_code ON rooms(pg_id, room_code);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE UNIQUE INDEX idx_beds_room_num ON beds(room_id, bed_number);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_pg ON bookings(pg_id);
CREATE INDEX idx_bookings_bed ON bookings(bed_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_pg ON payments(pg_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due ON payments(due_date);
CREATE INDEX idx_complaints_user ON complaints(user_id);
CREATE INDEX idx_complaints_pg ON complaints(pg_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_vendors_type ON vendors(type);
CREATE INDEX idx_vendors_city ON vendors(city);
CREATE INDEX idx_workers_pg ON workers(pg_id);
CREATE INDEX idx_workers_role ON workers(role);
CREATE INDEX idx_tenant_notes_owner ON tenant_notes(owner_id);
CREATE INDEX idx_tenant_notes_tenant ON tenant_notes(tenant_id);
CREATE INDEX idx_tenant_notes_pg ON tenant_notes(pg_id);
CREATE INDEX idx_activity_log_owner ON activity_log(owner_id);
CREATE INDEX idx_activity_log_pg ON activity_log(pg_id);

-- STEP 4: Row Level Security
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

-- Users policies
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);

-- PGs policies
CREATE POLICY "pgs_select" ON pgs FOR SELECT USING (true);
CREATE POLICY "pgs_insert" ON pgs FOR INSERT WITH CHECK (true);
CREATE POLICY "pgs_update" ON pgs FOR UPDATE USING (true);
CREATE POLICY "pgs_delete" ON pgs FOR DELETE USING (true);

-- Rooms policies
CREATE POLICY "rooms_select" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms_update" ON rooms FOR UPDATE USING (true);
CREATE POLICY "rooms_delete" ON rooms FOR DELETE USING (true);

-- Beds policies
CREATE POLICY "beds_select" ON beds FOR SELECT USING (true);
CREATE POLICY "beds_insert" ON beds FOR INSERT WITH CHECK (true);
CREATE POLICY "beds_update" ON beds FOR UPDATE USING (true);
CREATE POLICY "beds_delete" ON beds FOR DELETE USING (true);

-- Bookings policies
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (true);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE USING (true);

-- Payments policies
CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (true);
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (true);

-- Complaints policies
CREATE POLICY "complaints_select" ON complaints FOR SELECT USING (true);
CREATE POLICY "complaints_insert" ON complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "complaints_update" ON complaints FOR UPDATE USING (true);
CREATE POLICY "complaints_delete" ON complaints FOR DELETE USING (true);

-- Vendors policies
CREATE POLICY "vendors_select" ON vendors FOR SELECT USING (true);
CREATE POLICY "vendors_insert" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "vendors_update" ON vendors FOR UPDATE USING (true);
CREATE POLICY "vendors_delete" ON vendors FOR DELETE USING (true);

-- Workers policies
CREATE POLICY "workers_select" ON workers FOR SELECT USING (true);
CREATE POLICY "workers_insert" ON workers FOR INSERT WITH CHECK (true);
CREATE POLICY "workers_update" ON workers FOR UPDATE USING (true);
CREATE POLICY "workers_delete" ON workers FOR DELETE USING (true);

-- Tenant notes policies
CREATE POLICY "tenant_notes_select" ON tenant_notes FOR SELECT USING (true);
CREATE POLICY "tenant_notes_insert" ON tenant_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "tenant_notes_update" ON tenant_notes FOR UPDATE USING (true);
CREATE POLICY "tenant_notes_delete" ON tenant_notes FOR DELETE USING (true);

-- Activity log policies
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (true);
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (true);

-- STEP 5: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_uat BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pgs_uat BEFORE UPDATE ON pgs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_rooms_uat BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_beds_uat BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_bookings_uat BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_payments_uat BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_complaints_uat BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_vendors_uat BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_workers_uat BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tenant_notes_uat BEFORE UPDATE ON tenant_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- STEP 6: Seed Data

-- Owners
INSERT INTO users (id, name, email, phone, role, gender, is_verified, is_approved, avatar) VALUES
('owner-1', 'Rajesh Kumar', 'rajesh@stayease.in', '+919876543210', 'OWNER', 'MALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rajesh'),
('owner-2', 'Priya Sharma', 'priya@stayease.in', '+919876543211', 'OWNER', 'FEMALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya'),
('owner-3', 'Amit Patel', 'amit@stayease.in', '+919876543212', 'OWNER', 'MALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Amit');

-- Tenants
INSERT INTO users (id, name, email, phone, role, gender, is_verified, is_approved, avatar) VALUES
('tenant-1', 'Vikram Singh', 'vikram@email.com', '+919123456789', 'TENANT', 'MALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Vikram'),
('tenant-2', 'Ananya Reddy', 'ananya@email.com', '+919123456790', 'TENANT', 'FEMALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ananya'),
('tenant-3', 'Rohan Mehta', 'rohan@email.com', '+919123456791', 'TENANT', 'MALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rohan'),
('tenant-4', 'Sneha Joshi', 'sneha@email.com', '+919123456792', 'TENANT', 'FEMALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sneha'),
('tenant-5', 'Karthik Nair', 'karthik@email.com', '+919123456793', 'TENANT', 'MALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Karthik'),
('tenant-6', 'Divya Gupta', 'divya@email.com', '+919123456794', 'TENANT', 'FEMALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Divya');

-- Admin
INSERT INTO users (id, name, email, phone, role, gender, is_verified, is_approved, avatar) VALUES
('admin-1', 'Admin User', 'admin@stayease.in', '+919999999999', 'ADMIN', 'MALE', true, true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Admin');

-- PGs
INSERT INTO pgs (id, name, owner_id, description, address, city, lat, lng, gender, price, security_deposit, amenities, images, rating, total_reviews, status, is_verified) VALUES
('pg-1', 'Sunrise PG - Koramangala', 'owner-1', 'Premium PG accommodation in the heart of Koramangala with modern amenities.', '123, 4th Cross, Koramangala 4th Block', 'Bangalore', 12.9352, 77.6245, 'UNISEX', 12000, 24000, 'wifi,ac,food,laundry,parking,cctv,power_backup,water_heater,study_table,housekeeping', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop', 4.5, 128, 'APPROVED', true),
('pg-2', 'Green Valley PG - HSR Layout', 'owner-1', 'Peaceful PG surrounded by greenery in HSR Layout.', '45, 27th Main, HSR Layout Sector 2', 'Bangalore', 12.9116, 77.6389, 'MALE', 8500, 17000, 'wifi,food,laundry,cctv,power_backup,study_table,common_room,tv', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop', 4.2, 89, 'APPROVED', true),
('pg-3', 'Ladies Paradise PG - Indiranagar', 'owner-2', 'Safe and secure PG exclusively for women in Indiranagar.', '78, 100 Feet Road, Indiranagar', 'Bangalore', 12.9784, 77.6408, 'FEMALE', 14000, 28000, 'wifi,ac,food,laundry,cctv,power_backup,water_heater,wardrobe,housekeeping,gym', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 4.8, 156, 'APPROVED', true),
('pg-4', 'Tech Hub PG - Whitefield', 'owner-2', 'Modern co-living space near ITPL Whitefield.', '56, ITPL Main Road, Whitefield', 'Bangalore', 12.9698, 77.7500, 'UNISEX', 11000, 22000, 'wifi,ac,food,laundry,parking,gym,cctv,power_backup,common_room,tv,refrigerator', 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop', 4.3, 95, 'APPROVED', true),
('pg-5', 'Budget Bliss PG - Marathahalli', 'owner-3', 'Affordable PG with all basic amenities.', '23, Marathahalli Main Road', 'Bangalore', 12.9591, 77.6974, 'MALE', 6500, 13000, 'wifi,food,laundry,power_backup,study_table', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop', 3.9, 67, 'APPROVED', true),
('pg-6', 'Royal Residency PG - Electronic City', 'owner-3', 'Premium gated PG community in Electronic City.', '89, Phase 1, Electronic City', 'Bangalore', 12.8440, 77.6730, 'UNISEX', 15000, 30000, 'wifi,ac,food,laundry,parking,gym,cctv,power_backup,water_heater,study_table,wardrobe,housekeeping,common_room,tv,refrigerator', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 4.7, 210, 'APPROVED', true);

-- Rooms
INSERT INTO rooms (id, pg_id, room_code, room_type, floor, has_ac, has_attached_bath) VALUES
('room-a101', 'pg-1', 'A101', 'DOUBLE', 1, true, true),
('room-a102', 'pg-1', 'A102', 'DOUBLE', 1, true, true),
('room-a201', 'pg-1', 'A201', 'TRIPLE', 2, false, false),
('room-a202', 'pg-1', 'A202', 'SINGLE', 2, true, true),
('room-a301', 'pg-1', 'A301', 'DORMITORY', 3, false, false),
('room-b101', 'pg-2', 'B101', 'TRIPLE', 1, false, false),
('room-b102', 'pg-2', 'B102', 'DOUBLE', 1, false, true),
('room-b201', 'pg-2', 'B201', 'DOUBLE', 2, true, true),
('room-c101', 'pg-3', 'C101', 'DOUBLE', 1, true, true),
('room-c102', 'pg-3', 'C102', 'SINGLE', 1, true, true),
('room-c201', 'pg-3', 'C201', 'DOUBLE', 2, true, true),
('room-c202', 'pg-3', 'C202', 'DOUBLE', 2, false, false),
('room-d101', 'pg-4', 'D101', 'DOUBLE', 1, true, true),
('room-d102', 'pg-4', 'D102', 'TRIPLE', 1, false, false),
('room-d201', 'pg-4', 'D201', 'DOUBLE', 2, true, true),
('room-e101', 'pg-5', 'E101', 'DORMITORY', 1, false, false),
('room-e102', 'pg-5', 'E102', 'TRIPLE', 1, false, false),
('room-f101', 'pg-6', 'F101', 'SINGLE', 1, true, true),
('room-f102', 'pg-6', 'F102', 'SINGLE', 1, true, true),
('room-f201', 'pg-6', 'F201', 'DOUBLE', 2, true, true),
('room-f202', 'pg-6', 'F202', 'DOUBLE', 2, true, true),
('room-f301', 'pg-6', 'F301', 'DORMITORY', 3, false, false);

-- Beds
INSERT INTO beds (id, room_id, bed_number, status, price) VALUES
('bed-a101-1', 'room-a101', 1, 'OCCUPIED', NULL),
('bed-a101-2', 'room-a101', 2, 'AVAILABLE', NULL),
('bed-a102-1', 'room-a102', 1, 'AVAILABLE', NULL),
('bed-a102-2', 'room-a102', 2, 'OCCUPIED', NULL),
('bed-a201-1', 'room-a201', 1, 'OCCUPIED', NULL),
('bed-a201-2', 'room-a201', 2, 'OCCUPIED', NULL),
('bed-a201-3', 'room-a201', 3, 'AVAILABLE', NULL),
('bed-a202-1', 'room-a202', 1, 'OCCUPIED', NULL),
('bed-a301-1', 'room-a301', 1, 'OCCUPIED', NULL),
('bed-a301-2', 'room-a301', 2, 'AVAILABLE', NULL),
('bed-a301-3', 'room-a301', 3, 'OCCUPIED', NULL),
('bed-a301-4', 'room-a301', 4, 'AVAILABLE', NULL),
('bed-a301-5', 'room-a301', 5, 'OCCUPIED', NULL),
('bed-a301-6', 'room-a301', 6, 'AVAILABLE', NULL),
('bed-b101-1', 'room-b101', 1, 'OCCUPIED', NULL),
('bed-b101-2', 'room-b101', 2, 'AVAILABLE', NULL),
('bed-b101-3', 'room-b101', 3, 'OCCUPIED', NULL),
('bed-b102-1', 'room-b102', 1, 'AVAILABLE', NULL),
('bed-b102-2', 'room-b102', 2, 'OCCUPIED', NULL),
('bed-b201-1', 'room-b201', 1, 'OCCUPIED', NULL),
('bed-b201-2', 'room-b201', 2, 'OCCUPIED', NULL),
('bed-c101-1', 'room-c101', 1, 'OCCUPIED', NULL),
('bed-c101-2', 'room-c101', 2, 'OCCUPIED', NULL),
('bed-c102-1', 'room-c102', 1, 'AVAILABLE', NULL),
('bed-c201-1', 'room-c201', 1, 'OCCUPIED', NULL),
('bed-c201-2', 'room-c201', 2, 'AVAILABLE', NULL),
('bed-c202-1', 'room-c202', 1, 'OCCUPIED', NULL),
('bed-c202-2', 'room-c202', 2, 'OCCUPIED', NULL),
('bed-d101-1', 'room-d101', 1, 'OCCUPIED', NULL),
('bed-d101-2', 'room-d101', 2, 'AVAILABLE', NULL),
('bed-d102-1', 'room-d102', 1, 'AVAILABLE', NULL),
('bed-d102-2', 'room-d102', 2, 'OCCUPIED', NULL),
('bed-d102-3', 'room-d102', 3, 'OCCUPIED', NULL),
('bed-d201-1', 'room-d201', 1, 'OCCUPIED', NULL),
('bed-d201-2', 'room-d201', 2, 'AVAILABLE', NULL),
('bed-e101-1', 'room-e101', 1, 'OCCUPIED', NULL),
('bed-e101-2', 'room-e101', 2, 'OCCUPIED', NULL),
('bed-e101-3', 'room-e101', 3, 'AVAILABLE', NULL),
('bed-e101-4', 'room-e101', 4, 'OCCUPIED', NULL),
('bed-e101-5', 'room-e101', 5, 'AVAILABLE', NULL),
('bed-e101-6', 'room-e101', 6, 'OCCUPIED', NULL),
('bed-e102-1', 'room-e102', 1, 'AVAILABLE', NULL),
('bed-e102-2', 'room-e102', 2, 'OCCUPIED', NULL),
('bed-e102-3', 'room-e102', 3, 'AVAILABLE', NULL),
('bed-f101-1', 'room-f101', 1, 'OCCUPIED', NULL),
('bed-f102-1', 'room-f102', 1, 'OCCUPIED', NULL),
('bed-f201-1', 'room-f201', 1, 'AVAILABLE', NULL),
('bed-f201-2', 'room-f201', 2, 'OCCUPIED', NULL),
('bed-f202-1', 'room-f202', 1, 'OCCUPIED', NULL),
('bed-f202-2', 'room-f202', 2, 'OCCUPIED', NULL),
('bed-f301-1', 'room-f301', 1, 'AVAILABLE', NULL),
('bed-f301-2', 'room-f301', 2, 'OCCUPIED', NULL),
('bed-f301-3', 'room-f301', 3, 'OCCUPIED', NULL),
('bed-f301-4', 'room-f301', 4, 'AVAILABLE', NULL),
('bed-f301-5', 'room-f301', 5, 'OCCUPIED', NULL),
('bed-f301-6', 'room-f301', 6, 'AVAILABLE', NULL);

-- Bookings
INSERT INTO bookings (id, user_id, pg_id, bed_id, check_in_date, status, advance_paid) VALUES
('booking-1', 'tenant-1', 'pg-1', 'bed-a101-1', '2025-01-15T00:00:00Z', 'ACTIVE', 12000),
('booking-2', 'tenant-2', 'pg-3', 'bed-c101-1', '2025-02-01T00:00:00Z', 'ACTIVE', 14000),
('booking-3', 'tenant-3', 'pg-2', 'bed-b101-1', '2025-01-20T00:00:00Z', 'ACTIVE', 8500),
('booking-4', 'tenant-4', 'pg-3', 'bed-c101-2', '2025-03-01T00:00:00Z', 'ACTIVE', 14000),
('booking-5', 'tenant-5', 'pg-4', 'bed-d102-2', '2025-02-15T00:00:00Z', 'ACTIVE', 11000),
('booking-6', 'tenant-6', 'pg-3', 'bed-c202-1', '2025-04-01T00:00:00Z', 'ACTIVE', 14000);

-- Payments
INSERT INTO payments (id, user_id, pg_id, booking_id, amount, type, status, due_date, paid_date, method) VALUES
('pay-1-1', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-01-01T00:00:00Z', '2025-01-02T10:00:00Z', 'UPI'),
('pay-1-2', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-03T10:00:00Z', 'CARD'),
('pay-1-3', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-02T10:00:00Z', 'UPI'),
('pay-1-4', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-01T10:00:00Z', 'NET_BANKING'),
('pay-1-5', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-03T10:00:00Z', 'UPI'),
('pay-1-6', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
('pay-2-1', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-01T10:00:00Z', 'UPI'),
('pay-2-2', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-02T10:00:00Z', 'CASH'),
('pay-2-3', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-01T10:00:00Z', 'UPI'),
('pay-2-4', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-02T10:00:00Z', 'UPI'),
('pay-2-5', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
('pay-3-1', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-01-01T00:00:00Z', '2025-01-03T10:00:00Z', 'UPI'),
('pay-3-2', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-02T10:00:00Z', 'CARD'),
('pay-3-3', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-01T10:00:00Z', 'UPI'),
('pay-3-4', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-03T10:00:00Z', 'CASH'),
('pay-3-5', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-02T10:00:00Z', 'UPI'),
('pay-3-6', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
('pay-4-1', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-02T10:00:00Z', 'UPI'),
('pay-4-2', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-01T10:00:00Z', 'UPI'),
('pay-4-3', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-03T10:00:00Z', 'CARD'),
('pay-4-4', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
('pay-5-1', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-02T10:00:00Z', 'UPI'),
('pay-5-2', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-03T10:00:00Z', 'UPI'),
('pay-5-3', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-02T10:00:00Z', 'NET_BANKING'),
('pay-5-4', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-01T10:00:00Z', 'UPI'),
('pay-5-5', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
('pay-6-1', 'tenant-6', 'pg-3', 'booking-6', 14000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-02T10:00:00Z', 'UPI'),
('pay-6-2', 'tenant-6', 'pg-3', 'booking-6', 14000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-03T10:00:00Z', 'UPI'),
('pay-6-3', 'tenant-6', 'pg-3', 'booking-6', 14000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL);

-- Complaints
INSERT INTO complaints (id, user_id, pg_id, title, description, category, priority, status, assigned_to, resolution) VALUES
('complaint-1', 'tenant-1', 'pg-1', 'WiFi not working in Room A101', 'WiFi has been down for 2 days.', 'MAINTENANCE', 'HIGH', 'IN_PROGRESS', 'Arjun', NULL),
('complaint-2', 'tenant-2', 'pg-3', 'Water heater not functioning', 'Water heater in common bathroom stopped working.', 'MAINTENANCE', 'MEDIUM', 'OPEN', NULL, NULL),
('complaint-3', 'tenant-3', 'pg-2', 'Excessive noise from construction', 'Construction work next door creates noise.', 'NOISE', 'LOW', 'OPEN', NULL, NULL),
('complaint-4', 'tenant-4', 'pg-3', 'Bathroom cleanliness issue', 'Common bathroom not cleaned properly.', 'CLEANLINESS', 'MEDIUM', 'RESOLVED', 'Lakshmi', 'Cleaning schedule updated.'),
('complaint-5', 'tenant-5', 'pg-4', 'AC remote missing', 'AC remote in Room D102 is missing.', 'MAINTENANCE', 'LOW', 'RESOLVED', 'Arjun', 'Replacement remote provided.'),
('complaint-6', 'tenant-6', 'pg-3', 'Security gate malfunction', 'Main gate electronic lock not working.', 'SAFETY', 'URGENT', 'IN_PROGRESS', 'Ramesh', 'Technician called.');

-- Vendors
INSERT INTO vendors (id, name, type, phone, email, city, area, rating, status) VALUES
('vendor-1', 'QuickFix Plumbing', 'PLUMBER', '+919876540001', 'quickfix@email.com', 'Bangalore', 'Koramangala', 4.2, 'ACTIVE'),
('vendor-2', 'Spark Electric', 'ELECTRICIAN', '+919876540002', 'spark@email.com', 'Bangalore', 'HSR Layout', 4.5, 'ACTIVE'),
('vendor-3', 'CleanPro Services', 'CLEANER', '+919876540003', NULL, 'Bangalore', 'Indiranagar', 4.0, 'ACTIVE'),
('vendor-4', 'Fresh Paint Co', 'PAINTER', '+919876540004', 'freshpaint@email.com', 'Bangalore', 'Whitefield', 3.8, 'ACTIVE'),
('vendor-5', 'WoodCraft Works', 'CARPENTER', '+919876540005', NULL, 'Bangalore', 'Marathahalli', 4.3, 'ACTIVE'),
('vendor-6', 'NetConnect WiFi', 'WIFI', '+919876540006', 'netconnect@email.com', 'Bangalore', 'Electronic City', 4.6, 'ACTIVE'),
('vendor-7', 'Mr. Right Services', 'GENERAL', '+919876540007', NULL, 'Bangalore', 'JP Nagar', 3.9, 'ACTIVE'),
('vendor-8', 'PowerGrid Electric', 'ELECTRICIAN', '+919876540008', 'powergrid@email.com', 'Bangalore', 'BTM Layout', 4.1, 'ACTIVE');

-- Workers
INSERT INTO workers (id, name, role, phone, pg_id, shift, status) VALUES
('worker-1', 'Ramesh', 'SECURITY', '+919876550001', 'pg-1', 'NIGHT', 'ACTIVE'),
('worker-2', 'Geeta', 'CLEANER', '+919876550002', 'pg-1', 'MORNING', 'ACTIVE'),
('worker-3', 'Suresh', 'COOK', '+919876550003', 'pg-2', 'MORNING', 'ACTIVE'),
('worker-4', 'Lakshmi', 'CLEANER', '+919876550004', 'pg-3', 'EVENING', 'ACTIVE'),
('worker-5', 'Mohan', 'MANAGER', '+919876550005', 'pg-1', 'MORNING', 'ACTIVE'),
('worker-6', 'Kavitha', 'COOK', '+919876550006', 'pg-3', 'MORNING', 'ACTIVE'),
('worker-7', 'Arjun', 'MAINTENANCE', '+919876550007', 'pg-4', 'MORNING', 'ACTIVE'),
('worker-8', 'Padma', 'SECURITY', '+919876550008', 'pg-3', 'MORNING', 'ACTIVE');

-- DONE! Verify:
SELECT 'users' as table_name, count(*) as rows FROM users
UNION ALL SELECT 'pgs', count(*) FROM pgs
UNION ALL SELECT 'rooms', count(*) FROM rooms
UNION ALL SELECT 'beds', count(*) FROM beds
UNION ALL SELECT 'bookings', count(*) FROM bookings
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'complaints', count(*) FROM complaints
UNION ALL SELECT 'vendors', count(*) FROM vendors
UNION ALL SELECT 'workers', count(*) FROM workers
UNION ALL SELECT 'tenant_notes', count(*) FROM tenant_notes
UNION ALL SELECT 'activity_log', count(*) FROM activity_log
ORDER BY table_name;
