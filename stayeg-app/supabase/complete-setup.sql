-- =============================================================
-- StayEg v1.2 — COMPLETE DATABASE SETUP
-- =============================================================
-- Copy this entire SQL and paste into:
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- URL: https://supabase.com/dashboard/project/rgkbkdxfekslaygvjngm/sql
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'TENANT' CHECK (role IN ('TENANT', 'OWNER', 'ADMIN', 'VENDOR')),
  avatar TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  kyc_doc TEXT,
  bio TEXT,
  city TEXT,
  occupation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PGs
CREATE TABLE IF NOT EXISTS pgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bangalore',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  gender TEXT NOT NULL DEFAULT 'UNISEX' CHECK (gender IN ('MALE', 'FEMALE', 'UNISEX')),
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  security_deposit DOUBLE PRECISION NOT NULL DEFAULT 0,
  amenities TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '',
  rating DOUBLE PRECISION NOT NULL DEFAULT 4.0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'SHARED' CHECK (room_type IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY', 'SHARED')),
  floor INTEGER NOT NULL DEFAULT 1,
  has_ac BOOLEAN NOT NULL DEFAULT false,
  has_attached_bath BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BEDS
CREATE TABLE IF NOT EXISTS beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED')),
  price DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  check_in_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  advance_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL DEFAULT 'RENT' CHECK (type IN ('RENT', 'ADVANCE', 'SECURITY_DEPOSIT', 'DEPOSIT', 'MAINTENANCE', 'PENALTY', 'REFUND')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. COMPLAINTS
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID NOT NULL REFERENCES pgs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'FOOD', 'GENERAL', 'OTHER')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PLUMBER', 'ELECTRICIAN', 'CLEANER', 'PAINTER', 'CARPENTER', 'WIFI', 'GENERAL')),
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL DEFAULT 'Bangalore',
  area TEXT,
  rating DOUBLE PRECISION NOT NULL DEFAULT 4.0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. WORKERS
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SECURITY', 'CLEANER', 'COOK', 'MANAGER', 'MAINTENANCE')),
  phone TEXT NOT NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  shift TEXT CHECK (shift IN ('MORNING', 'EVENING', 'NIGHT')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TENANT NOTES
CREATE TABLE IF NOT EXISTS tenant_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  pg_id UUID NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role, is_approved);
CREATE INDEX IF NOT EXISTS idx_pgs_owner ON pgs(owner_id);
CREATE INDEX IF NOT EXISTS idx_pgs_city ON pgs(city);
CREATE INDEX IF NOT EXISTS idx_pgs_status ON pgs(status);
CREATE INDEX IF NOT EXISTS idx_pgs_price ON pgs(price);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_pg_code ON rooms(pg_id, room_code);
CREATE INDEX IF NOT EXISTS idx_beds_room ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_room_num ON beds(room_id, bed_number);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg ON bookings(pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_pg ON payments(pg_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_pg ON complaints(pg_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_workers_pg ON workers(pg_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notes_owner ON tenant_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_owner ON activity_log(owner_id);

-- RLS (permissive for MVP — tighten later)
DO $$ BEGIN
  FOR tbl IN ARRAY ['users','pgs','rooms','beds','bookings','payments','complaints','vendors','workers','tenant_notes','activity_log'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DO $$ BEGIN CREATE POLICY "all_" || %L || " ON ' || %L || ' FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$', tbl, tbl);
  END LOOP;
END $$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  FOR tbl IN ARRAY ['users','pgs','rooms','beds','bookings','payments','complaints','vendors','workers','tenant_notes'] LOOP
    EXECUTE format('DO $$ BEGIN CREATE TRIGGER tr_%s_uat BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$', tbl, tbl);
  END LOOP;
END $$;

-- Add notes column to payments if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'notes') THEN
    ALTER TABLE payments ADD COLUMN notes TEXT;
  END IF;
END $$;

SELECT 'All 11 tables created successfully!' as result;
