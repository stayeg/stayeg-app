-- =============================================================
-- StayEg v1.2 — Supabase Production Schema
-- =============================================================
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor)
-- It creates all tables, indexes, RLS policies, and triggers.
-- =============================================================

-- Enable UUID extension (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 1. USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'TENANT'
                CHECK (role IN ('TENANT', 'OWNER', 'VENDOR', 'ADMIN')),
  avatar        TEXT,
  gender        TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  is_approved   BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  kyc_doc       TEXT,
  bio           TEXT,
  city          TEXT,
  occupation    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 2. PGs (Paying Guest accommodations)
-- =============================================================
CREATE TABLE IF NOT EXISTS pgs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  owner_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  description       TEXT,
  address           TEXT NOT NULL,
  city              TEXT NOT NULL DEFAULT 'Bangalore',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  gender            TEXT NOT NULL DEFAULT 'UNISEX'
                    CHECK (gender IN ('MALE', 'FEMALE', 'UNISEX')),
  price             DOUBLE PRECISION NOT NULL,
  security_deposit  DOUBLE PRECISION NOT NULL DEFAULT 0,
  amenities         TEXT NOT NULL DEFAULT '',
  images            TEXT NOT NULL DEFAULT '',
  rating            DOUBLE PRECISION NOT NULL DEFAULT 4.0,
  total_reviews     INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 3. ROOMS
-- =============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id             UUID NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  room_code         TEXT NOT NULL,
  room_type         TEXT NOT NULL DEFAULT 'SHARED'
                    CHECK (room_type IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY', 'SHARED')),
  floor             INTEGER NOT NULL DEFAULT 1,
  has_ac            BOOLEAN NOT NULL DEFAULT false,
  has_attached_bath BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 4. BEDS
-- =============================================================
CREATE TABLE IF NOT EXISTS beds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'AVAILABLE'
              CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED')),
  price       DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 5. BOOKINGS
-- =============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id         UUID REFERENCES pgs(id) ON DELETE SET NULL,
  bed_id        UUID REFERENCES beds(id) ON DELETE SET NULL,
  check_in_date TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  advance_paid  DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 6. PAYMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id         UUID REFERENCES pgs(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount        DOUBLE PRECISION NOT NULL,
  type          TEXT NOT NULL DEFAULT 'RENT'
                CHECK (type IN ('RENT', 'ADVANCE', 'SECURITY_DEPOSIT', 'DEPOSIT', 'MAINTENANCE', 'PENALTY', 'REFUND')),
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  due_date      TIMESTAMPTZ,
  paid_date     TIMESTAMPTZ,
  method        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 7. COMPLAINTS
-- =============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  pg_id       UUID NOT NULL REFERENCES pgs(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'GENERAL'
              CHECK (category IN ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'FOOD', 'GENERAL', 'OTHER')),
  priority    TEXT NOT NULL DEFAULT 'MEDIUM'
              CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status      TEXT NOT NULL DEFAULT 'OPEN'
              CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to TEXT,
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 8. VENDORS
-- =============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL
              CHECK (type IN ('PLUMBER', 'ELECTRICIAN', 'CLEANER', 'PAINTER', 'CARPENTER', 'WIFI', 'GENERAL')),
  phone       TEXT NOT NULL,
  email       TEXT,
  city        TEXT NOT NULL DEFAULT 'Bangalore',
  area        TEXT,
  rating      DOUBLE PRECISION NOT NULL DEFAULT 4.0,
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
              CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 9. WORKERS
-- =============================================================
CREATE TABLE IF NOT EXISTS workers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL
              CHECK (role IN ('SECURITY', 'CLEANER', 'COOK', 'MANAGER', 'MAINTENANCE')),
  phone       TEXT NOT NULL,
  pg_id       UUID REFERENCES pgs(id) ON DELETE SET NULL,
  shift       TEXT CHECK (shift IN ('MORNING', 'EVENING', 'NIGHT')),
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
              CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role, is_approved);

-- PGs
CREATE INDEX IF NOT EXISTS idx_pgs_owner_id      ON pgs(owner_id);
CREATE INDEX IF NOT EXISTS idx_pgs_city          ON pgs(city);
CREATE INDEX IF NOT EXISTS idx_pgs_gender        ON pgs(gender);
CREATE INDEX IF NOT EXISTS idx_pgs_status        ON pgs(status);
CREATE INDEX IF NOT EXISTS idx_pgs_price         ON pgs(price);
CREATE INDEX IF NOT EXISTS idx_pgs_rating        ON pgs(rating DESC);

-- Rooms
CREATE INDEX IF NOT EXISTS idx_rooms_pg_id       ON rooms(pg_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_code   ON rooms(pg_id, room_code);

-- Beds
CREATE INDEX IF NOT EXISTS idx_beds_room_id      ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status       ON beds(status);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id  ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg_id    ON bookings(pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_bed_id   ON bookings(bed_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id  ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_pg_id    ON payments(pg_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- Complaints
CREATE INDEX IF NOT EXISTS idx_complaints_user_id   ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_pg_id     ON complaints(pg_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status    ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority  ON complaints(priority);

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_type     ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_city     ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_status   ON vendors(status);

-- Workers
CREATE INDEX IF NOT EXISTS idx_workers_pg_id    ON workers(pg_id);
CREATE INDEX IF NOT EXISTS idx_workers_role     ON workers(role);
CREATE INDEX IF NOT EXISTS idx_workers_status   ON workers(status);

-- =============================================================
-- COMPOSITE UNIQUE CONSTRAINTS
-- =============================================================

-- One room code per PG
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_pg_id_room_code
  ON rooms(pg_id, room_code);

-- One bed number per room
CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_room_id_bed_number
  ON beds(room_id, bed_number);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers    ENABLE ROW LEVEL SECURITY;

-- Anon/public read access (all tables readable without auth)
DO $$ BEGIN
  CREATE POLICY "Anon read users"      ON users      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read pgs"        ON pgs        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read rooms"      ON rooms      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read beds"       ON beds       FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read bookings"   ON bookings   FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read payments"   ON payments   FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read complaints" ON complaints FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read vendors"    ON vendors    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anon read workers"    ON workers    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role (authenticated) full access on all tables
DO $$ BEGIN
  CREATE POLICY "Service role all users"
    ON users FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all pgs"
    ON pgs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all rooms"
    ON rooms FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all beds"
    ON beds FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all bookings"
    ON bookings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all payments"
    ON payments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all complaints"
    ON complaints FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all vendors"
    ON vendors FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role all workers"
    ON workers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- UPDATED_AT AUTO-UPDATE TRIGGER
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_pgs_updated_at
    BEFORE UPDATE ON pgs FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_rooms_updated_at
    BEFORE UPDATE ON rooms FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_beds_updated_at
    BEFORE UPDATE ON beds FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_bookings_updated_at
    BEFORE UPDATE ON bookings FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_payments_updated_at
    BEFORE UPDATE ON payments FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_complaints_updated_at
    BEFORE UPDATE ON complaints FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_vendors_updated_at
    BEFORE UPDATE ON vendors FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_workers_updated_at
    BEFORE UPDATE ON workers FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- DONE — Verify by running:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- =============================================================
