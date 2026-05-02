-- ============================================================
-- StayEg Security Migration SQL
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rgkbkdxfekslaygvjngm/sql
-- ============================================================

-- 1. Add security columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'NOT_STARTED' CHECK (kyc_status IN ('NOT_STARTED', 'SUBMITTED', 'VERIFIED', 'REJECTED'));

-- 2. Add missing columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- 3. Create rent_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS rent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL')),
  paid_date TIMESTAMPTZ,
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'GENERAL',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_rent_records_user ON rent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_pg ON rent_records(pg_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

-- 6. Enable RLS on all tables (if not already enabled)
DO $$ BEGIN
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE rent_records ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. Set RLS policies for rent_records
DO $$ BEGIN CREATE POLICY "all_rent_records" ON rent_records FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Set RLS policies for notifications
DO $$ BEGIN CREATE POLICY "all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. Set default password for all existing users (bcrypt hash of 'StayEg@2025')
-- This allows existing users to login with password 'StayEg@2025' until they change it
DO $$
DECLARE
  default_hash TEXT := '$2a$12$LJ3m4ys3dPMaJr0z5ZMJuOZhR6m7sGKN/FzZ0EK/FDFHCyRN0JnhG';
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM users WHERE password_hash IS NULL OR password_hash = ''
  LOOP
    UPDATE users SET password_hash = default_hash WHERE id = user_rec.id;
  END LOOP;
END;
$$;

-- Done! Run this once to secure your database.
SELECT 'Security migration complete!' AS status;
