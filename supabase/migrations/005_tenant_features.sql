-- ============================================================
-- Migration 005: Tenant Features
-- Adds notifications, documents, coupons, and coupon_usages tables
-- plus default coupons and supporting indexes/triggers.
-- ============================================================

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO', -- INFO, WARNING, SUCCESS, ERROR
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents table (tenant document vault)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- ID_PROOF, AGREEMENT, RECEIPT, OTHER
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'PERCENTAGE', -- PERCENTAGE, FLAT
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2) DEFAULT 0,
  usage_limit INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Coupon usages table (track who used what)
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id, booking_id)
);

-- 5. Auto-update updated_at for documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Default coupons
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_until) VALUES
  ('WELCOME500', 'FLAT', 500, 5000, 500, 1000, '2026-12-31'),
  ('FIRSTFREE', 'PERCENTAGE', 100, 0, 2000, 500, '2026-12-31'),
  ('STAY20', 'PERCENTAGE', 20, 3000, 1000, 2000, '2026-12-31'),
  ('RENT10', 'PERCENTAGE', 10, 2000, 500, 5000, '2026-12-31')
ON CONFLICT (code) DO NOTHING;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id);
