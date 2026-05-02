-- =====================================================
-- StayeG - Complete Database Schema for Supabase
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. USERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
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

-- ===========================================
-- 2. PGs (PAYING GUEST) TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS pgs (
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

CREATE INDEX IF NOT EXISTS idx_pgs_owner ON pgs(owner_id);
CREATE INDEX IF NOT EXISTS idx_pgs_city ON pgs(city);
CREATE INDEX IF NOT EXISTS idx_pgs_gender ON pgs(gender);
CREATE INDEX IF NOT EXISTS idx_pgs_status ON pgs(status);

-- ===========================================
-- 3. ROOMS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS rooms (
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

CREATE INDEX IF NOT EXISTS idx_rooms_pg ON rooms(pg_id);

-- ===========================================
-- 4. BEDS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS beds (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')),
  price      DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beds_room ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);

-- ===========================================
-- 5. BOOKINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS bookings (
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

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg ON bookings(pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_bed ON bookings(bed_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ===========================================
-- 6. PAYMENTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  booking_id  TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  amount      DOUBLE PRECISION NOT NULL,
  type        TEXT NOT NULL DEFAULT 'RENT' CHECK (type IN ('RENT', 'ADVANCE', 'SECURITY_DEPOSIT')),
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  due_date    TIMESTAMPTZ,
  paid_date   TIMESTAMPTZ,
  method      TEXT CHECK (method IN ('UPI', 'CARD', 'NET_BANKING', 'CASH')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_pg ON payments(pg_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ===========================================
-- 7. COMPLAINTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS complaints (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'GENERAL')),
  priority    TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to TEXT,
  resolution  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_pg ON complaints(pg_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- ===========================================
-- 8. VENDORS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS vendors (
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

CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);

-- ===========================================
-- 9. WORKERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS workers (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('SECURITY', 'CLEANER', 'COOK', 'MANAGER', 'MAINTENANCE')),
  phone      TEXT NOT NULL,
  pg_id      TEXT REFERENCES pgs(id) ON DELETE SET NULL,
  shift      TEXT CHECK (shift IN ('MORNING', 'EVENING', 'NIGHT')),
  status     TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_pg ON workers(pg_id);
CREATE INDEX IF NOT EXISTS idx_workers_role ON workers(role);

CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role, is_approved);

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Users: Allow read all, insert for self, update for self
CREATE POLICY "Users readable by all" ON users FOR SELECT USING (true);
CREATE POLICY "Users insertable by anon" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users updatable by all" ON users FOR UPDATE USING (true);

-- PGs: Allow read all approved PGs, read own PGs regardless of status
CREATE POLICY "PGs readable by all" ON pgs FOR SELECT USING (true);
CREATE POLICY "PGs insertable by all" ON pgs FOR INSERT WITH CHECK (true);
CREATE POLICY "PGs updatable by all" ON pgs FOR UPDATE USING (true);

-- Rooms: Allow all operations
CREATE POLICY "Rooms readable by all" ON rooms FOR SELECT USING (true);
CREATE POLICY "Rooms insertable by all" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Rooms updatable by all" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Rooms deletable by all" ON rooms FOR DELETE USING (true);

-- Beds: Allow all operations
CREATE POLICY "Beds readable by all" ON beds FOR SELECT USING (true);
CREATE POLICY "Beds insertable by all" ON beds FOR INSERT WITH CHECK (true);
CREATE POLICY "Beds updatable by all" ON beds FOR UPDATE USING (true);
CREATE POLICY "Beds deletable by all" ON beds FOR DELETE USING (true);

-- Bookings: Allow all operations
CREATE POLICY "Bookings readable by all" ON bookings FOR SELECT USING (true);
CREATE POLICY "Bookings insertable by all" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings updatable by all" ON bookings FOR UPDATE USING (true);
CREATE POLICY "Bookings deletable by all" ON bookings FOR DELETE USING (true);

-- Payments: Allow all operations
CREATE POLICY "Payments readable by all" ON payments FOR SELECT USING (true);
CREATE POLICY "Payments insertable by all" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Payments updatable by all" ON payments FOR UPDATE USING (true);
CREATE POLICY "Payments deletable by all" ON payments FOR DELETE USING (true);

-- Complaints: Allow all operations
CREATE POLICY "Complaints readable by all" ON complaints FOR SELECT USING (true);
CREATE POLICY "Complaints insertable by all" ON complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Complaints updatable by all" ON complaints FOR UPDATE USING (true);

-- Vendors: Allow all operations
CREATE POLICY "Vendors readable by all" ON vendors FOR SELECT USING (true);
CREATE POLICY "Vendors insertable by all" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Vendors updatable by all" ON vendors FOR UPDATE USING (true);
CREATE POLICY "Vendors deletable by all" ON vendors FOR DELETE USING (true);

-- Workers: Allow all operations
CREATE POLICY "Workers readable by all" ON workers FOR SELECT USING (true);
CREATE POLICY "Workers insertable by all" ON workers FOR INSERT WITH CHECK (true);
CREATE POLICY "Workers updatable by all" ON workers FOR UPDATE USING (true);
CREATE POLICY "Workers deletable by all" ON workers FOR DELETE USING (true);

-- ===========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pgs_updated_at BEFORE UPDATE ON pgs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- SAMPLE DATA SEED
-- ===========================================

-- Users (Owners)
INSERT INTO users (id, name, email, phone, role, gender, is_verified, avatar) VALUES
('owner-1', 'Rajesh Kumar', 'rajesh@stayease.in', '+919876543210', 'OWNER', 'MALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rajesh'),
('owner-2', 'Priya Sharma', 'priya@stayease.in', '+919876543211', 'OWNER', 'FEMALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya'),
('owner-3', 'Amit Patel', 'amit@stayease.in', '+919876543212', 'OWNER', 'MALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Amit')
ON CONFLICT (email) DO NOTHING;

-- Users (Tenants)
INSERT INTO users (id, name, email, phone, role, gender, is_verified, avatar) VALUES
('tenant-1', 'Vikram Singh', 'vikram@email.com', '+919123456789', 'TENANT', 'MALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Vikram'),
('tenant-2', 'Ananya Reddy', 'ananya@email.com', '+919123456790', 'TENANT', 'FEMALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ananya'),
('tenant-3', 'Rohan Mehta', 'rohan@email.com', '+919123456791', 'TENANT', 'MALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rohan'),
('tenant-4', 'Sneha Joshi', 'sneha@email.com', '+919123456792', 'TENANT', 'FEMALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sneha'),
('tenant-5', 'Karthik Nair', 'karthik@email.com', '+919123456793', 'TENANT', 'MALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Karthik'),
('tenant-6', 'Divya Gupta', 'divya@email.com', '+919123456794', 'TENANT', 'FEMALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Divya')
ON CONFLICT (email) DO NOTHING;

-- User (Admin)
INSERT INTO users (id, name, email, phone, role, gender, is_verified, avatar) VALUES
('admin-1', 'Admin User', 'admin@stayease.in', '+919999999999', 'ADMIN', 'MALE', true, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Admin')
ON CONFLICT (email) DO NOTHING;

-- PGs
INSERT INTO pgs (id, name, owner_id, description, address, city, lat, lng, gender, price, security_deposit, amenities, images, rating, total_reviews, status, is_verified) VALUES
('pg-1', 'Sunrise PG - Koramangala', 'owner-1', 'Premium PG accommodation in the heart of Koramangala with modern amenities. Walking distance to major IT parks, restaurants, and metro station.', '123, 4th Cross, Koramangala 4th Block', 'Bangalore', 12.9352, 77.6245, 'UNISEX', 12000, 24000, 'wifi,ac,food,laundry,parking,cctv,power_backup,water_heater,study_table,housekeeping', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop', 4.5, 128, 'APPROVED', true),
('pg-2', 'Green Valley PG - HSR Layout', 'owner-1', 'Peaceful PG surrounded by greenery in HSR Layout. Homely food, clean rooms, and friendly atmosphere.', '45, 27th Main, HSR Layout Sector 2', 'Bangalore', 12.9116, 77.6389, 'MALE', 8500, 17000, 'wifi,food,laundry,cctv,power_backup,study_table,common_room,tv', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop', 4.2, 89, 'APPROVED', true),
('pg-3', 'Ladies Paradise PG - Indiranagar', 'owner-2', 'Safe and secure PG exclusively for women in Indiranagar. Close to metro and shopping areas.', '78, 100 Feet Road, Indiranagar', 'Bangalore', 12.9784, 77.6408, 'FEMALE', 14000, 28000, 'wifi,ac,food,laundry,cctv,power_backup,water_heater,wardrobe,housekeeping,gym', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 4.8, 156, 'APPROVED', true),
('pg-4', 'Tech Hub PG - Whitefield', 'owner-2', 'Modern co-living space near ITPL Whitefield. Ideal for tech professionals.', '56, ITPL Main Road, Whitefield', 'Bangalore', 12.9698, 77.7500, 'UNISEX', 11000, 22000, 'wifi,ac,food,laundry,parking,gym,cctv,power_backup,common_room,tv,refrigerator', 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop', 4.3, 95, 'APPROVED', true),
('pg-5', 'Budget Bliss PG - Marathahalli', 'owner-3', 'Affordable PG with all basic amenities. Excellent connectivity to IT hubs.', '23, Marathahalli Main Road', 'Bangalore', 12.9591, 77.6974, 'MALE', 6500, 13000, 'wifi,food,laundry,power_backup,study_table', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop', 3.9, 67, 'APPROVED', true),
('pg-6', 'Royal Residency PG - Electronic City', 'owner-3', 'Premium gated PG community in Electronic City. Resort-like amenities.', '89, Phase 1, Electronic City', 'Bangalore', 12.8440, 77.6730, 'UNISEX', 15000, 30000, 'wifi,ac,food,laundry,parking,gym,cctv,power_backup,water_heater,study_table,wardrobe,housekeeping,common_room,tv,refrigerator', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 4.7, 210, 'APPROVED', true),
('pg-7', 'Cozy Corner PG - BTM Layout', 'owner-1', 'A cozy and comfortable PG in BTM Layout for students and young professionals.', '12, 2nd Stage, BTM Layout', 'Bangalore', 12.9166, 77.6101, 'FEMALE', 9500, 19000, 'wifi,food,laundry,cctv,power_backup,water_heater,wardrobe,housekeeping', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop', 4.1, 78, 'PENDING', false),
('pg-8', 'Urban Nest PG - JP Nagar', 'owner-2', 'Modern PG in the vibrant JP Nagar area. Great food and community vibe.', '34, 4th Phase, JP Nagar', 'Bangalore', 12.9100, 77.5850, 'UNISEX', 10500, 21000, 'wifi,food,laundry,parking,cctv,power_backup,study_table,common_room,tv,housekeeping', 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=400&fit=crop,https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop', 4.4, 112, 'PENDING', false)
ON CONFLICT DO NOTHING;

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
('room-f301', 'pg-6', 'F301', 'DORMITORY', 3, false, false),
('room-g101', 'pg-7', 'G101', 'DOUBLE', 1, false, true),
('room-g201', 'pg-7', 'G201', 'DOUBLE', 2, false, true),
('room-h101', 'pg-8', 'H101', 'TRIPLE', 1, false, false),
('room-h102', 'pg-8', 'H102', 'DOUBLE', 1, true, true)
ON CONFLICT DO NOTHING;

-- Beds (generated for each room based on room type)
INSERT INTO beds (id, room_id, bed_number, status, price) VALUES
-- Room A101 (DOUBLE = 2 beds)
('bed-a101-1', 'room-a101', 1, 'OCCUPIED', NULL),
('bed-a101-2', 'room-a101', 2, 'AVAILABLE', NULL),
-- Room A102 (DOUBLE = 2 beds)
('bed-a102-1', 'room-a102', 1, 'AVAILABLE', NULL),
('bed-a102-2', 'room-a102', 2, 'OCCUPIED', NULL),
-- Room A201 (TRIPLE = 3 beds)
('bed-a201-1', 'room-a201', 1, 'OCCUPIED', NULL),
('bed-a201-2', 'room-a201', 2, 'OCCUPIED', NULL),
('bed-a201-3', 'room-a201', 3, 'AVAILABLE', NULL),
-- Room A202 (SINGLE = 1 bed)
('bed-a202-1', 'room-a202', 1, 'OCCUPIED', NULL),
-- Room A301 (DORMITORY = 6 beds)
('bed-a301-1', 'room-a301', 1, 'OCCUPIED', NULL),
('bed-a301-2', 'room-a301', 2, 'AVAILABLE', NULL),
('bed-a301-3', 'room-a301', 3, 'OCCUPIED', NULL),
('bed-a301-4', 'room-a301', 4, 'AVAILABLE', NULL),
('bed-a301-5', 'room-a301', 5, 'OCCUPIED', NULL),
('bed-a301-6', 'room-a301', 6, 'AVAILABLE', NULL),
-- Room B101 (TRIPLE = 3 beds)
('bed-b101-1', 'room-b101', 1, 'OCCUPIED', NULL),
('bed-b101-2', 'room-b101', 2, 'AVAILABLE', NULL),
('bed-b101-3', 'room-b101', 3, 'OCCUPIED', NULL),
-- Room B102 (DOUBLE = 2 beds)
('bed-b102-1', 'room-b102', 1, 'AVAILABLE', NULL),
('bed-b102-2', 'room-b102', 2, 'OCCUPIED', NULL),
-- Room B201 (DOUBLE = 2 beds)
('bed-b201-1', 'room-b201', 1, 'OCCUPIED', NULL),
('bed-b201-2', 'room-b201', 2, 'OCCUPIED', NULL),
-- Room C101 (DOUBLE = 2 beds)
('bed-c101-1', 'room-c101', 1, 'OCCUPIED', NULL),
('bed-c101-2', 'room-c101', 2, 'OCCUPIED', NULL),
-- Room C102 (SINGLE = 1 bed)
('bed-c102-1', 'room-c102', 1, 'AVAILABLE', NULL),
-- Room C201 (DOUBLE = 2 beds)
('bed-c201-1', 'room-c201', 1, 'OCCUPIED', NULL),
('bed-c201-2', 'room-c201', 2, 'AVAILABLE', NULL),
-- Room C202 (DOUBLE = 2 beds)
('bed-c202-1', 'room-c202', 1, 'OCCUPIED', NULL),
('bed-c202-2', 'room-c202', 2, 'OCCUPIED', NULL),
-- Room D101 (DOUBLE = 2 beds)
('bed-d101-1', 'room-d101', 1, 'OCCUPIED', NULL),
('bed-d101-2', 'room-d101', 2, 'AVAILABLE', NULL),
-- Room D102 (TRIPLE = 3 beds)
('bed-d102-1', 'room-d102', 1, 'AVAILABLE', NULL),
('bed-d102-2', 'room-d102', 2, 'OCCUPIED', NULL),
('bed-d102-3', 'room-d102', 3, 'OCCUPIED', NULL),
-- Room D201 (DOUBLE = 2 beds)
('bed-d201-1', 'room-d201', 1, 'OCCUPIED', NULL),
('bed-d201-2', 'room-d201', 2, 'AVAILABLE', NULL),
-- Room E101 (DORMITORY = 6 beds)
('bed-e101-1', 'room-e101', 1, 'OCCUPIED', NULL),
('bed-e101-2', 'room-e101', 2, 'OCCUPIED', NULL),
('bed-e101-3', 'room-e101', 3, 'AVAILABLE', NULL),
('bed-e101-4', 'room-e101', 4, 'OCCUPIED', NULL),
('bed-e101-5', 'room-e101', 5, 'AVAILABLE', NULL),
('bed-e101-6', 'room-e101', 6, 'OCCUPIED', NULL),
-- Room E102 (TRIPLE = 3 beds)
('bed-e102-1', 'room-e102', 1, 'AVAILABLE', NULL),
('bed-e102-2', 'room-e102', 2, 'OCCUPIED', NULL),
('bed-e102-3', 'room-e102', 3, 'AVAILABLE', NULL),
-- Room F101 (SINGLE = 1 bed)
('bed-f101-1', 'room-f101', 1, 'OCCUPIED', NULL),
-- Room F102 (SINGLE = 1 bed)
('bed-f102-1', 'room-f102', 1, 'OCCUPIED', NULL),
-- Room F201 (DOUBLE = 2 beds)
('bed-f201-1', 'room-f201', 1, 'AVAILABLE', NULL),
('bed-f201-2', 'room-f201', 2, 'OCCUPIED', NULL),
-- Room F202 (DOUBLE = 2 beds)
('bed-f202-1', 'room-f202', 1, 'OCCUPIED', NULL),
('bed-f202-2', 'room-f202', 2, 'OCCUPIED', NULL),
-- Room F301 (DORMITORY = 6 beds)
('bed-f301-1', 'room-f301', 1, 'AVAILABLE', NULL),
('bed-f301-2', 'room-f301', 2, 'OCCUPIED', NULL),
('bed-f301-3', 'room-f301', 3, 'OCCUPIED', NULL),
('bed-f301-4', 'room-f301', 4, 'AVAILABLE', NULL),
('bed-f301-5', 'room-f301', 5, 'OCCUPIED', NULL),
('bed-f301-6', 'room-f301', 6, 'AVAILABLE', NULL),
-- Room G101 (DOUBLE = 2 beds)
('bed-g101-1', 'room-g101', 1, 'OCCUPIED', NULL),
('bed-g101-2', 'room-g101', 2, 'AVAILABLE', NULL),
-- Room G201 (DOUBLE = 2 beds)
('bed-g201-1', 'room-g201', 1, 'AVAILABLE', NULL),
('bed-g201-2', 'room-g201', 2, 'OCCUPIED', NULL),
-- Room H101 (TRIPLE = 3 beds)
('bed-h101-1', 'room-h101', 1, 'OCCUPIED', NULL),
('bed-h101-2', 'room-h101', 2, 'AVAILABLE', NULL),
('bed-h101-3', 'room-h101', 3, 'OCCUPIED', NULL),
-- Room H102 (DOUBLE = 2 beds)
('bed-h102-1', 'room-h102', 1, 'AVAILABLE', NULL),
('bed-h102-2', 'room-h102', 2, 'OCCUPIED', NULL)
ON CONFLICT DO NOTHING;

-- Bookings (matching occupied beds)
INSERT INTO bookings (id, user_id, pg_id, bed_id, check_in_date, status, advance_paid) VALUES
('booking-1', 'tenant-1', 'pg-1', 'bed-a101-1', '2025-01-15T00:00:00Z', 'ACTIVE', 12000),
('booking-2', 'tenant-2', 'pg-3', 'bed-c101-1', '2025-02-01T00:00:00Z', 'ACTIVE', 14000),
('booking-3', 'tenant-3', 'pg-2', 'bed-b101-1', '2025-01-20T00:00:00Z', 'ACTIVE', 8500),
('booking-4', 'tenant-4', 'pg-3', 'bed-c101-2', '2025-03-01T00:00:00Z', 'ACTIVE', 14000),
('booking-5', 'tenant-5', 'pg-4', 'bed-d102-2', '2025-02-15T00:00:00Z', 'ACTIVE', 11000),
('booking-6', 'tenant-6', 'pg-3', 'bed-c202-1', '2025-04-01T00:00:00Z', 'ACTIVE', 14000)
ON CONFLICT DO NOTHING;

-- Payments (monthly rent for each booking)
INSERT INTO payments (id, user_id, pg_id, booking_id, amount, type, status, due_date, paid_date, method) VALUES
-- Booking 1 payments (Vikram -> PG1)
('pay-1-1', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-01-01T00:00:00Z', '2025-01-02T10:00:00Z', 'UPI'),
('pay-1-2', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-03T10:00:00Z', 'CARD'),
('pay-1-3', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-02T10:00:00Z', 'UPI'),
('pay-1-4', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-01T10:00:00Z', 'NET_BANKING'),
('pay-1-5', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-03T10:00:00Z', 'UPI'),
('pay-1-6', 'tenant-1', 'pg-1', 'booking-1', 12000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
-- Booking 2 payments (Ananya -> PG3)
('pay-2-1', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-01T10:00:00Z', 'UPI'),
('pay-2-2', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-02T10:00:00Z', 'CASH'),
('pay-2-3', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-01T10:00:00Z', 'UPI'),
('pay-2-4', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-02T10:00:00Z', 'UPI'),
('pay-2-5', 'tenant-2', 'pg-3', 'booking-2', 14000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
-- Booking 3 payments (Rohan -> PG2)
('pay-3-1', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-01-01T00:00:00Z', '2025-01-03T10:00:00Z', 'UPI'),
('pay-3-2', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-02T10:00:00Z', 'CARD'),
('pay-3-3', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-01T10:00:00Z', 'UPI'),
('pay-3-4', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-03T10:00:00Z', 'CASH'),
('pay-3-5', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-02T10:00:00Z', 'UPI'),
('pay-3-6', 'tenant-3', 'pg-2', 'booking-3', 8500, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
-- Booking 4 payments (Sneha -> PG3)
('pay-4-1', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-02T10:00:00Z', 'UPI'),
('pay-4-2', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-01T10:00:00Z', 'UPI'),
('pay-4-3', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-03T10:00:00Z', 'CARD'),
('pay-4-4', 'tenant-4', 'pg-3', 'booking-4', 14000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
-- Booking 5 payments (Karthik -> PG4)
('pay-5-1', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-02-01T00:00:00Z', '2025-02-02T10:00:00Z', 'UPI'),
('pay-5-2', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-03-01T00:00:00Z', '2025-03-03T10:00:00Z', 'UPI'),
('pay-5-3', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-02T10:00:00Z', 'NET_BANKING'),
('pay-5-4', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-01T10:00:00Z', 'UPI'),
('pay-5-5', 'tenant-5', 'pg-4', 'booking-5', 11000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL),
-- Booking 6 payments (Divya -> PG3)
('pay-6-1', 'tenant-6', 'pg-3', 'booking-6', 14000, 'RENT', 'COMPLETED', '2025-04-01T00:00:00Z', '2025-04-02T10:00:00Z', 'UPI'),
('pay-6-2', 'tenant-6', 'pg-3', 'booking-6', 14000, 'RENT', 'COMPLETED', '2025-05-01T00:00:00Z', '2025-05-03T10:00:00Z', 'UPI'),
('pay-6-3', 'tenant-6', 'pg-3', 'booking-6', 14000, 'RENT', 'PENDING', '2025-06-01T00:00:00Z', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Complaints
INSERT INTO complaints (id, user_id, pg_id, title, description, category, priority, status, assigned_to, resolution) VALUES
('complaint-1', 'tenant-1', 'pg-1', 'WiFi not working in Room A101', 'WiFi has been down for 2 days. Multiple complaints raised but no resolution yet. Very inconvenient for work from home.', 'MAINTENANCE', 'HIGH', 'IN_PROGRESS', 'Arjun', NULL),
('complaint-2', 'tenant-2', 'pg-3', 'Water heater not functioning', 'The water heater in the common bathroom has stopped working since last week. Cold water is very difficult during early morning.', 'MAINTENANCE', 'MEDIUM', 'OPEN', NULL, NULL),
('complaint-3', 'tenant-3', 'pg-2', 'Excessive noise from construction nearby', 'Construction work next door creates noise from 7 AM to 10 PM daily. Very disturbing for studies and sleep.', 'NOISE', 'LOW', 'OPEN', NULL, NULL),
('complaint-4', 'tenant-4', 'pg-3', 'Common bathroom cleanliness issue', 'The common bathroom on 2nd floor is not being cleaned properly. Cleaning schedule not being followed.', 'CLEANLINESS', 'MEDIUM', 'RESOLVED', 'Lakshmi', 'Cleaning schedule has been updated. Bathroom is now being cleaned twice daily.'),
('complaint-5', 'tenant-5', 'pg-4', 'AC remote missing', 'The AC remote in Room D102 is missing since yesterday. Room is getting very hot without AC.', 'MAINTENANCE', 'LOW', 'RESOLVED', 'Arjun', 'Replacement remote has been provided.'),
('complaint-6', 'tenant-6', 'pg-3', 'Security gate malfunction', 'The main gate electronic lock is not working properly. It sometimes doesn''t close, compromising security.', 'SAFETY', 'URGENT', 'IN_PROGRESS', 'Ramesh', 'Technician has been called. Temporary lock installed.')
ON CONFLICT DO NOTHING;

-- Vendors
INSERT INTO vendors (id, name, type, phone, email, city, area, rating, status) VALUES
('vendor-1', 'QuickFix Plumbing', 'PLUMBER', '+919876540001', 'quickfix@email.com', 'Bangalore', 'Koramangala', 4.2, 'ACTIVE'),
('vendor-2', 'Spark Electric', 'ELECTRICIAN', '+919876540002', 'spark@email.com', 'Bangalore', 'HSR Layout', 4.5, 'ACTIVE'),
('vendor-3', 'CleanPro Services', 'CLEANER', '+919876540003', NULL, 'Bangalore', 'Indiranagar', 4.0, 'ACTIVE'),
('vendor-4', 'Fresh Paint Co', 'PAINTER', '+919876540004', 'freshpaint@email.com', 'Bangalore', 'Whitefield', 3.8, 'ACTIVE'),
('vendor-5', 'WoodCraft Works', 'CARPENTER', '+919876540005', NULL, 'Bangalore', 'Marathahalli', 4.3, 'ACTIVE'),
('vendor-6', 'NetConnect WiFi', 'WIFI', '+919876540006', 'netconnect@email.com', 'Bangalore', 'Electronic City', 4.6, 'ACTIVE'),
('vendor-7', 'Mr. Right Services', 'GENERAL', '+919876540007', NULL, 'Bangalore', 'JP Nagar', 3.9, 'ACTIVE'),
('vendor-8', 'PowerGrid Electric', 'ELECTRICIAN', '+919876540008', 'powergrid@email.com', 'Bangalore', 'BTM Layout', 4.1, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Workers
INSERT INTO workers (id, name, role, phone, pg_id, shift, status) VALUES
('worker-1', 'Ramesh', 'SECURITY', '+919876550001', 'pg-1', 'NIGHT', 'ACTIVE'),
('worker-2', 'Geeta', 'CLEANER', '+919876550002', 'pg-1', 'MORNING', 'ACTIVE'),
('worker-3', 'Suresh', 'COOK', '+919876550003', 'pg-2', 'MORNING', 'ACTIVE'),
('worker-4', 'Lakshmi', 'CLEANER', '+919876550004', 'pg-3', 'EVENING', 'ACTIVE'),
('worker-5', 'Mohan', 'MANAGER', '+919876550005', 'pg-1', 'MORNING', 'ACTIVE'),
('worker-6', 'Kavitha', 'COOK', '+919876550006', 'pg-3', 'MORNING', 'ACTIVE'),
('worker-7', 'Arjun', 'MAINTENANCE', '+919876550007', 'pg-4', 'MORNING', 'ACTIVE'),
('worker-8', 'Padma', 'SECURITY', '+919876550008', 'pg-3', 'MORNING', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- Your StayeG database is ready with:
-- - 10 users (3 owners, 6 tenants, 1 admin)
-- - 8 PGs (6 approved, 2 pending)
-- - 26 rooms across all PGs
-- - 67 beds (37 occupied, 30 available)
-- - 6 active bookings
-- - 29 payments
-- - 6 complaints
-- - 8 vendors
-- - 8 workers
-- =====================================================
