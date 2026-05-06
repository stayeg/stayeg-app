-- =============================================================
-- StayEg — Phase 5: Database Hardening Migration (IDEMPOTENT v4)
-- =============================================================
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- AFTER running PRODUCTION SETUP and Phase 2 Security.
--
-- This version is FULLY IDEMPOTENT — you can run it as many
-- times as you want without errors, even after partial failures.
--
-- KEY FIX v4: All Phase 5 tables are DROPPED first, then
-- recreated from scratch. This prevents schema mismatches
-- from previous partial runs (e.g., missing columns like pg_id).
-- =============================================================


-- =============================================================
-- STEP 0: NUCLEAR CLEANUP — drop everything we'll recreate
-- =============================================================
-- We drop Phase 5 tables, views, functions, triggers, constraints.
-- Phase 5 tables are EMPTY (no real data), so dropping is safe.
-- Production tables (users, pgs, rooms, beds, bookings, payments,
-- complaints, vendors, workers, tenant_notes, activity_log,
-- reviews, notifications, coupons, coupon_usages) are NOT touched.

-- 0a. Drop dashboard views FIRST (they block ALTER COLUMN TYPE)
DROP VIEW IF EXISTS v_owner_dashboard CASCADE;
DROP VIEW IF EXISTS v_tenant_dashboard CASCADE;
DROP VIEW IF EXISTS v_payment_summary CASCADE;
DROP VIEW IF EXISTS v_payment_reconciliation CASCADE;
DROP VIEW IF EXISTS v_bed_availability CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_owner_dashboard CASCADE;

-- 0b. Drop ALL Phase 5 tables (CASCADE handles policies/triggers/indexes)
-- Order: child tables first, then parent tables
DROP TABLE IF EXISTS review_helpful_votes CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS leave_notices CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;

-- 0c. Drop functions we will recreate (TARGETED — never blanket!)
DROP FUNCTION IF EXISTS release_bed_on_booking_close() CASCADE;
DROP FUNCTION IF EXISTS occupy_bed_on_booking() CASCADE;
DROP FUNCTION IF EXISTS auto_release_expired_beds() CASCADE;
DROP FUNCTION IF EXISTS notify_owner_on_booking() CASCADE;
DROP FUNCTION IF EXISTS notify_tenant_overdue_payment() CASCADE;
DROP FUNCTION IF EXISTS notify_tenant_complaint_update() CASCADE;
DROP FUNCTION IF EXISTS log_booking_activity() CASCADE;
DROP FUNCTION IF EXISTS log_payment_activity() CASCADE;
DROP FUNCTION IF EXISTS log_complaint_activity() CASCADE;
DROP FUNCTION IF EXISTS record_payment_atomic(TEXT, TEXT, TEXT, DOUBLE PRECISION, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_payment_atomic(TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cancel_booking_atomic(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS complete_booking_atomic(TEXT) CASCADE;
DROP FUNCTION IF EXISTS transfer_bed_atomic(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS apply_coupon_atomic(TEXT, TEXT, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS generate_monthly_rent(TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS validate_coupon(TEXT, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS get_pg_occupancy(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_payment_history(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_valid_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_valid_indian_phone(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_valid_ifsc(TEXT) CASCADE;

-- 0d. Drop triggers on production tables (will be recreated)
DROP TRIGGER IF EXISTS tr_release_bed_on_close ON bookings;
DROP TRIGGER IF EXISTS tr_occupy_bed_on_booking ON bookings;
DROP TRIGGER IF EXISTS tr_notify_owner_booking ON bookings;
DROP TRIGGER IF EXISTS tr_notify_overdue_payment ON payments;
DROP TRIGGER IF EXISTS tr_notify_complaint_update ON complaints;
DROP TRIGGER IF EXISTS tr_log_booking_activity ON bookings;
DROP TRIGGER IF EXISTS tr_log_payment_activity ON payments;
DROP TRIGGER IF EXISTS tr_log_complaint_activity ON complaints;

-- 0e. Drop constraints on production tables (will be recreated)
DO $$ BEGIN
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amount_positive;
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_advance_nonneg;
  ALTER TABLE pgs DROP CONSTRAINT IF EXISTS chk_pgs_price_nonneg;
  ALTER TABLE pgs DROP CONSTRAINT IF EXISTS chk_pgs_deposit_nonneg;
  ALTER TABLE reviews DROP CONSTRAINT IF EXISTS chk_reviews_comment_length;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================
-- STEP 1: Create ALL new tables
-- =============================================================
-- Tables were DROPPED in STEP 0b, so CREATE TABLE always runs.
-- IF NOT EXISTS is kept as a safety net but shouldn't be needed.

-- 1a. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount      DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1c. Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pg_id       TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  room_id     TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1d. Leave Notices
CREATE TABLE IF NOT EXISTS leave_notices (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id           TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  notice_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  intended_leave  DATE NOT NULL,
  actual_leave    DATE,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reviewed_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 1e. Reports
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  pg_id       TEXT REFERENCES pgs(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('FRAUD', 'MAINTENANCE', 'NOISE', 'SAFETY', 'OTHER')),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1f. Contact Submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1g. Review Helpful Votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  review_id  TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (review_id, user_id)
);


-- =============================================================
-- STEP 2: RLS for new tables + Policies
-- =============================================================
-- No need to DROP policies first — tables were just DROP + CREATE
-- in STEP 0b + STEP 1, so they're guaranteed clean.

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Expense Categories
CREATE POLICY "expense_categories_select_service" ON expense_categories FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "expense_categories_insert_service" ON expense_categories FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "expense_categories_update_service" ON expense_categories FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "expense_categories_delete_service" ON expense_categories FOR DELETE USING (auth.role() = 'service_role');

-- Expenses
CREATE POLICY "expenses_select_service" ON expenses FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "expenses_insert_service" ON expenses FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "expenses_update_service" ON expenses FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "expenses_delete_service" ON expenses FOR DELETE USING (auth.role() = 'service_role');

-- Maintenance Requests
CREATE POLICY "maintenance_requests_select_service" ON maintenance_requests FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "maintenance_requests_insert_service" ON maintenance_requests FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "maintenance_requests_update_service" ON maintenance_requests FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "maintenance_requests_delete_service" ON maintenance_requests FOR DELETE USING (auth.role() = 'service_role');

-- Leave Notices
CREATE POLICY "leave_notices_select_service" ON leave_notices FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "leave_notices_insert_service" ON leave_notices FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "leave_notices_update_service" ON leave_notices FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "leave_notices_delete_service" ON leave_notices FOR DELETE USING (auth.role() = 'service_role');

-- Reports
CREATE POLICY "reports_select_service" ON reports FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "reports_insert_service" ON reports FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "reports_update_service" ON reports FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "reports_delete_service" ON reports FOR DELETE USING (auth.role() = 'service_role');

-- Contact Submissions
CREATE POLICY "contact_submissions_select_service" ON contact_submissions FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "contact_submissions_insert_service" ON contact_submissions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "contact_submissions_update_service" ON contact_submissions FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "contact_submissions_delete_service" ON contact_submissions FOR DELETE USING (auth.role() = 'service_role');

-- Review Helpful Votes
CREATE POLICY "review_helpful_votes_select_service" ON review_helpful_votes FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "review_helpful_votes_insert_service" ON review_helpful_votes FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "review_helpful_votes_delete_service" ON review_helpful_votes FOR DELETE USING (auth.role() = 'service_role');


-- =============================================================
-- STEP 3: Additional constraints (idempotent)
-- =============================================================

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT chk_bookings_advance_nonneg CHECK (advance_paid >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE pgs ADD CONSTRAINT chk_pgs_price_nonneg CHECK (price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE pgs ADD CONSTRAINT chk_pgs_deposit_nonneg CHECK (security_deposit >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT chk_reviews_comment_length CHECK (length(comment) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leave_notices ADD CONSTRAINT chk_leave_intended_after_notice CHECK (intended_leave >= notice_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================
-- STEP 4: Triggers
-- =============================================================

-- 4a. Release bed when booking closes
CREATE OR REPLACE FUNCTION release_bed_on_booking_close()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
     AND NEW.status IN ('COMPLETED', 'CANCELLED') THEN
    UPDATE beds SET status = 'AVAILABLE' WHERE id = NEW.bed_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_release_bed_on_close
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION release_bed_on_booking_close();


-- 4b. Mark bed as OCCUPIED when booking is created
CREATE OR REPLACE FUNCTION occupy_bed_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('PENDING', 'CONFIRMED', 'ACTIVE') THEN
    UPDATE beds SET status = 'OCCUPIED' WHERE id = NEW.bed_id AND status = 'AVAILABLE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_occupy_bed_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION occupy_bed_on_booking();


-- 4c. Auto-release expired reserved beds
CREATE OR REPLACE FUNCTION auto_release_expired_beds()
RETURNS void AS $$
BEGIN
  UPDATE beds
  SET status = 'AVAILABLE',
      updated_at = NOW()
  WHERE status = 'RESERVED'
    AND id NOT IN (
      SELECT bed_id FROM bookings
      WHERE status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
    );
END;
$$ LANGUAGE plpgsql;


-- 4d. Notify owner on new booking
CREATE OR REPLACE FUNCTION notify_owner_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_pg_name  TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_pg_name
  FROM pgs WHERE id = NEW.pg_id;

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_owner_id,
    'New Booking',
    'A new booking has been created at ' || COALESCE(v_pg_name, 'your PG'),
    'INFO',
    jsonb_build_object('bookingId', NEW.id, 'pgId', NEW.pg_id, 'bedId', NEW.bed_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notify_owner_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_booking();


-- 4e. Notify tenant on overdue payment
CREATE OR REPLACE FUNCTION notify_tenant_overdue_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PENDING' AND NEW.due_date < NOW() THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Payment Overdue',
      'Your payment of Rs. ' || NEW.amount || ' is overdue. Please pay immediately.',
      'WARNING',
      jsonb_build_object('paymentId', NEW.id, 'amount', NEW.amount, 'dueDate', NEW.due_date)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notify_overdue_payment
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_tenant_overdue_payment();


-- 4f. Notify tenant on complaint status change
CREATE OR REPLACE FUNCTION notify_tenant_complaint_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Complaint Update',
      'Your complaint "' || NEW.title || '" status changed to ' || NEW.status,
      'INFO',
      jsonb_build_object('complaintId', NEW.id, 'newStatus', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notify_complaint_update
  AFTER UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_tenant_complaint_update();


-- 4g. Log booking status changes
CREATE OR REPLACE FUNCTION log_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id FROM pgs WHERE id = COALESCE(NEW.pg_id, OLD.pg_id);

  INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
  VALUES (
    v_owner_id,
    COALESCE(NEW.pg_id, OLD.pg_id),
    'BOOKING_STATUS_CHANGE',
    'Booking status changed from ' || OLD.status || ' to ' || NEW.status,
    'booking',
    COALESCE(NEW.id, OLD.id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_booking_activity
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_booking_activity();


-- 4h. Log payment completions
CREATE OR REPLACE FUNCTION log_payment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  IF NEW.status = 'COMPLETED' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT owner_id INTO v_owner_id FROM pgs WHERE id = NEW.pg_id;

    INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
    VALUES (
      v_owner_id,
      NEW.pg_id,
      'PAYMENT_RECEIVED',
      'Payment of Rs. ' || NEW.amount || ' received via ' || COALESCE(NEW.method, 'N/A'),
      'payment',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_payment_activity
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_payment_activity();


-- 4i. Log new complaints
CREATE OR REPLACE FUNCTION log_complaint_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id FROM pgs WHERE id = NEW.pg_id;

  INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
  VALUES (
    v_owner_id,
    NEW.pg_id,
    'COMPLAINT_CREATED',
    'New complaint: ' || NEW.title || ' (Priority: ' || NEW.priority || ')',
    'complaint',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_complaint_activity
  AFTER INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION log_complaint_activity();


-- 4j. updated_at triggers for new tables
CREATE TRIGGER tr_expenses_uat BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_maintenance_requests_uat BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_leave_notices_uat BEFORE UPDATE ON leave_notices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_reports_uat BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_contact_submissions_uat BEFORE UPDATE ON contact_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================
-- STEP 5: Performance indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_user_pg ON bookings(user_id, pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg_status ON bookings(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_pg ON payments(user_id, pg_id);
CREATE INDEX IF NOT EXISTS idx_payments_pg_status ON payments(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_complaints_pg_status ON complaints(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority) WHERE priority IN ('HIGH', 'URGENT');

CREATE INDEX IF NOT EXISTS idx_expenses_pg ON expenses(pg_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_categories_pg ON expense_categories(pg_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_pg ON maintenance_requests(pg_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by ON maintenance_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_leave_notices_booking ON leave_notices(booking_id);
CREATE INDEX IF NOT EXISTS idx_leave_notices_user ON leave_notices(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_notices_pg ON leave_notices(pg_id);
CREATE INDEX IF NOT EXISTS idx_leave_notices_status ON leave_notices(status);

CREATE INDEX IF NOT EXISTS idx_reports_pg ON reports(pg_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_read ON contact_submissions(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user ON review_helpful_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_owner_pg ON activity_log(owner_id, pg_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_pgs_name_trgm ON pgs USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pgs_address_trgm ON pgs USING gin(address gin_trgm_ops);


-- =============================================================
-- STEP 6: Soft delete columns (BEFORE monetary migration & views)
-- =============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE beds ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE leave_notices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pgs_deleted ON pgs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NOT NULL;


-- =============================================================
-- STEP 7: Monetary type migration (AFTER dropping views)
-- =============================================================

ALTER TABLE pgs ALTER COLUMN price TYPE NUMERIC(12,2);
ALTER TABLE pgs ALTER COLUMN security_deposit TYPE NUMERIC(12,2);
ALTER TABLE beds ALTER COLUMN price TYPE NUMERIC(12,2);
ALTER TABLE bookings ALTER COLUMN advance_paid TYPE NUMERIC(12,2);
ALTER TABLE payments ALTER COLUMN amount TYPE NUMERIC(12,2);
ALTER TABLE expenses ALTER COLUMN amount TYPE NUMERIC(12,2);


-- =============================================================
-- STEP 8: Dashboard views (AFTER soft delete + monetary migration)
-- =============================================================

-- 8a. Owner dashboard
CREATE OR REPLACE VIEW v_owner_dashboard AS
SELECT
  p.id AS pg_id,
  p.name AS pg_name,
  p.city,
  p.status AS pg_status,
  p.deleted_at AS pg_deleted_at,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'ACTIVE') AS active_tenants,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'PENDING') AS pending_bookings,
  COUNT(DISTINCT bed.id) FILTER (WHERE bed.status = 'AVAILABLE') AS available_beds,
  COUNT(DISTINCT bed.id) FILTER (WHERE bed.status = 'OCCUPIED') AS occupied_beds,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'COMPLETED' AND pay.paid_date >= date_trunc('month', NOW())), 0) AS revenue_this_month,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PENDING'), 0) AS pending_payments_total,
  COUNT(DISTINCT comp.id) FILTER (WHERE comp.status IN ('OPEN', 'IN_PROGRESS')) AS open_complaints,
  p.rating,
  p.total_reviews
FROM pgs p
LEFT JOIN bookings b ON b.pg_id = p.id AND b.deleted_at IS NULL
LEFT JOIN beds bed ON bed.room_id IN (SELECT id FROM rooms WHERE pg_id = p.id) AND bed.deleted_at IS NULL
LEFT JOIN payments pay ON pay.pg_id = p.id AND pay.deleted_at IS NULL
LEFT JOIN complaints comp ON comp.pg_id = p.id AND comp.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.city, p.status, p.deleted_at, p.rating, p.total_reviews;


-- 8b. Tenant dashboard
CREATE OR REPLACE VIEW v_tenant_dashboard AS
SELECT
  u.id AS user_id,
  u.name AS tenant_name,
  b.id AS booking_id,
  b.status AS booking_status,
  b.check_in_date,
  b.deleted_at AS booking_deleted_at,
  p.id AS pg_id,
  p.name AS pg_name,
  p.address,
  p.city,
  p.deleted_at AS pg_deleted_at,
  bed.id AS bed_id,
  COALESCE(bed.price, p.price) AS monthly_rent,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PENDING'), 0) AS outstanding_amount,
  COUNT(pay.id) FILTER (WHERE pay.status = 'PENDING') AS pending_payments_count,
  COUNT(comp.id) FILTER (WHERE comp.status IN ('OPEN', 'IN_PROGRESS')) AS open_complaints_count
FROM users u
LEFT JOIN bookings b ON b.user_id = u.id AND b.status IN ('PENDING', 'CONFIRMED', 'ACTIVE') AND b.deleted_at IS NULL
LEFT JOIN pgs p ON p.id = b.pg_id AND p.deleted_at IS NULL
LEFT JOIN beds bed ON bed.id = b.bed_id AND bed.deleted_at IS NULL
LEFT JOIN payments pay ON pay.booking_id = b.id AND pay.deleted_at IS NULL
LEFT JOIN complaints comp ON comp.user_id = u.id AND comp.pg_id = b.pg_id AND comp.deleted_at IS NULL
WHERE u.deleted_at IS NULL AND u.role = 'TENANT'
GROUP BY u.id, u.name, b.id, b.status, b.check_in_date, b.deleted_at,
         p.id, p.name, p.address, p.city, p.deleted_at, bed.id, bed.price, p.price;


-- 8c. Payment summary
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT
  p.id AS pg_id,
  p.name AS pg_name,
  p.deleted_at AS pg_deleted_at,
  COUNT(pay.id) AS total_payments,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'COMPLETED'), 0) AS total_collected,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PENDING'), 0) AS total_pending,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'COMPLETED' AND pay.paid_date >= date_trunc('month', NOW())), 0) AS collected_this_month,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'COMPLETED' AND pay.paid_date >= date_trunc('year', NOW())), 0) AS collected_this_year,
  COUNT(pay.id) FILTER (WHERE pay.status = 'PENDING' AND pay.due_date < NOW()) AS overdue_count,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PENDING' AND pay.due_date < NOW()), 0) AS overdue_amount
FROM pgs p
LEFT JOIN payments pay ON pay.pg_id = p.id AND pay.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.deleted_at;


-- 8d. Payment reconciliation
CREATE OR REPLACE VIEW v_payment_reconciliation AS
SELECT
  pay.id AS payment_id,
  pay.amount,
  pay.type AS payment_type,
  pay.status AS payment_status,
  pay.method,
  pay.paid_date,
  pay.due_date,
  pay.razorpay_payment_id,
  u.name AS tenant_name,
  u.email AS tenant_email,
  p.name AS pg_name,
  b.id AS booking_id,
  b.status AS booking_status
FROM payments pay
JOIN users u ON u.id = pay.user_id
JOIN pgs p ON p.id = pay.pg_id
LEFT JOIN bookings b ON b.id = pay.booking_id
WHERE pay.deleted_at IS NULL
ORDER BY pay.paid_date DESC NULLS LAST;


-- 8e. Bed availability
CREATE OR REPLACE VIEW v_bed_availability AS
SELECT
  p.id AS pg_id,
  p.name AS pg_name,
  p.city,
  p.gender,
  p.deleted_at AS pg_deleted_at,
  r.id AS room_id,
  r.room_code,
  r.room_type,
  r.has_ac,
  r.has_attached_bath,
  bed.id AS bed_id,
  bed.bed_number,
  bed.status AS bed_status,
  COALESCE(bed.price, p.price) AS bed_price
FROM pgs p
JOIN rooms r ON r.pg_id = p.id AND r.deleted_at IS NULL
JOIN beds bed ON bed.room_id = r.id AND bed.deleted_at IS NULL
WHERE p.deleted_at IS NULL AND p.status = 'APPROVED';


-- =============================================================
-- STEP 9: Atomic RPC functions
-- =============================================================

-- 9a. Record payment (idempotent by razorpay_payment_id)
CREATE OR REPLACE FUNCTION record_payment_atomic(
  p_user_id           TEXT,
  p_pg_id             TEXT,
  p_booking_id        TEXT,
  p_amount            NUMERIC(12,2),
  p_type              TEXT,
  p_method            TEXT,
  p_razorpay_order_id TEXT DEFAULT NULL,
  p_razorpay_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id TEXT;
  v_existing_id TEXT;
BEGIN
  IF p_razorpay_payment_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM payments
    WHERE razorpay_payment_id = p_razorpay_payment_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'payment', jsonb_build_object('id', v_existing_id),
        'status', 'DUPLICATE'
      );
    END IF;
  END IF;

  INSERT INTO payments (user_id, pg_id, booking_id, amount, type, status, method, paid_date, razorpay_order_id, razorpay_payment_id)
  VALUES (p_user_id, p_pg_id, p_booking_id, p_amount, p_type, 'COMPLETED', p_method, NOW(), p_razorpay_order_id, p_razorpay_payment_id)
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'payment', jsonb_build_object('id', v_payment_id),
    'status', 'CREATED'
  );
END;
$$;


-- 9b. Cancel booking
CREATE OR REPLACE FUNCTION cancel_booking_atomic(
  p_booking_id TEXT,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_booking.status IN ('COMPLETED', 'CANCELLED') THEN
    RETURN jsonb_build_object('error', 'Booking already ' || v_booking.status, 'code', 'INVALID_STATUS');
  END IF;

  UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = p_booking_id;
  UPDATE beds SET status = 'AVAILABLE', updated_at = NOW() WHERE id = v_booking.bed_id AND status = 'OCCUPIED';

  RETURN jsonb_build_object(
    'bookingId', p_booking_id,
    'bedId', v_booking.bed_id,
    'status', 'CANCELLED'
  );
END;
$$;


-- 9c. Complete booking
CREATE OR REPLACE FUNCTION complete_booking_atomic(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_booking.status NOT IN ('ACTIVE', 'CONFIRMED') THEN
    RETURN jsonb_build_object('error', 'Booking must be ACTIVE or CONFIRMED to complete', 'code', 'INVALID_STATUS');
  END IF;

  UPDATE bookings SET status = 'COMPLETED', updated_at = NOW() WHERE id = p_booking_id;
  UPDATE beds SET status = 'AVAILABLE', updated_at = NOW() WHERE id = v_booking.bed_id AND status = 'OCCUPIED';

  RETURN jsonb_build_object(
    'bookingId', p_booking_id,
    'bedId', v_booking.bed_id,
    'status', 'COMPLETED'
  );
END;
$$;


-- 9d. Transfer bed
CREATE OR REPLACE FUNCTION transfer_bed_atomic(
  p_booking_id TEXT,
  p_old_bed_id TEXT,
  p_new_bed_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
  v_new_bed_status TEXT;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_booking.status NOT IN ('ACTIVE', 'CONFIRMED') THEN
    RETURN jsonb_build_object('error', 'Booking must be active to transfer', 'code', 'INVALID_STATUS');
  END IF;

  IF v_booking.bed_id != p_old_bed_id THEN
    RETURN jsonb_build_object('error', 'Booking is not for the specified bed', 'code', 'BED_MISMATCH');
  END IF;

  SELECT status INTO v_new_bed_status FROM beds WHERE id = p_new_bed_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'New bed not found', 'code', 'BED_NOT_FOUND');
  END IF;

  IF v_new_bed_status != 'AVAILABLE' THEN
    RETURN jsonb_build_object('error', 'New bed is not available', 'code', 'BED_OCCUPIED');
  END IF;

  UPDATE bookings SET bed_id = p_new_bed_id, updated_at = NOW() WHERE id = p_booking_id;
  UPDATE beds SET status = 'AVAILABLE', updated_at = NOW() WHERE id = p_old_bed_id;
  UPDATE beds SET status = 'OCCUPIED', updated_at = NOW() WHERE id = p_new_bed_id;

  RETURN jsonb_build_object(
    'bookingId', p_booking_id,
    'oldBedId', p_old_bed_id,
    'newBedId', p_new_bed_id,
    'status', 'TRANSFERRED'
  );
END;
$$;


-- 9e. Apply coupon (atomic check + usage)
CREATE OR REPLACE FUNCTION apply_coupon_atomic(
  p_coupon_code TEXT,
  p_user_id     TEXT,
  p_booking_id  TEXT,
  p_order_amount NUMERIC(12,2)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_coupon RECORD;
  v_usage_count INTEGER;
  v_discount NUMERIC(12,2);
  v_coupon_usage_id TEXT;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE code = p_coupon_code AND is_active = TRUE LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon');
  END IF;

  IF v_coupon.valid_from > NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not yet active');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Usage limit reached');
  END IF;

  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum order amount is Rs. ' || v_coupon.min_order_amount);
  END IF;

  SELECT COUNT(*) INTO v_usage_count FROM coupon_usages WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_usage_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  IF v_coupon.discount_type = 'PERCENTAGE' THEN
    v_discount := LEAST(
      (p_order_amount * v_coupon.discount_value / 100),
      COALESCE(v_coupon.max_discount, p_order_amount)
    );
  ELSE
    v_discount := LEAST(v_coupon.discount_value, p_order_amount);
  END IF;

  INSERT INTO coupon_usages (coupon_id, user_id, booking_id, discount_amount)
  VALUES (v_coupon.id, p_user_id, p_booking_id, v_discount)
  RETURNING id INTO v_coupon_usage_id;

  UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount', v_discount,
    'final_amount', GREATEST(p_order_amount - v_discount, 0),
    'usage_id', v_coupon_usage_id
  );
END;
$$;


-- 9f. Generate monthly rent payments
CREATE OR REPLACE FUNCTION generate_monthly_rent(
  p_pg_id  TEXT,
  p_for_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_booking RECORD;
BEGIN
  FOR v_booking IN
    SELECT b.id, b.user_id, b.bed_id,
           COALESCE(bed.price, p.price) AS rent_amount
    FROM bookings b
    JOIN pgs p ON p.id = b.pg_id
    LEFT JOIN beds bed ON bed.id = b.bed_id
    WHERE b.pg_id = p_pg_id
      AND b.status = 'ACTIVE'
      AND b.deleted_at IS NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM payments
      WHERE booking_id = v_booking.id
        AND type = 'RENT'
        AND due_date >= p_for_month
        AND due_date < p_for_month + INTERVAL '1 month'
    ) THEN
      INSERT INTO payments (user_id, pg_id, booking_id, amount, type, status, due_date)
      VALUES (
        v_booking.user_id,
        p_pg_id,
        v_booking.id,
        v_booking.rent_amount,
        'RENT',
        'PENDING',
        p_for_month + INTERVAL '5 days'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'pg_id', p_pg_id,
    'for_month', p_for_month,
    'payments_generated', v_count
  );
END;
$$;


-- =============================================================
-- STEP 10: Validation helper functions
-- =============================================================

-- 10a. Validate coupon (read-only)
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code        TEXT,
  p_user_id     TEXT,
  p_order_amount NUMERIC(12,2)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_coupon RECORD;
  v_usage_count INTEGER;
  v_discount   NUMERIC(12,2);
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = p_code AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon code');
  END IF;

  IF v_coupon.valid_from > NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon is not yet active');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;

  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum order amount is Rs. ' || v_coupon.min_order_amount);
  END IF;

  SELECT COUNT(*) INTO v_usage_count
  FROM coupon_usages
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_usage_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  IF v_coupon.discount_type = 'PERCENTAGE' THEN
    v_discount := LEAST(
      (p_order_amount * v_coupon.discount_value / 100),
      COALESCE(v_coupon.max_discount, p_order_amount)
    );
  ELSE
    v_discount := LEAST(v_coupon.discount_value, p_order_amount);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'calculated_discount', v_discount,
    'final_amount', GREATEST(p_order_amount - v_discount, 0)
  );
END;
$$;


-- 10b. Get PG occupancy stats
CREATE OR REPLACE FUNCTION get_pg_occupancy(p_pg_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_beds   INTEGER;
  v_occupied_beds INTEGER;
  v_available    INTEGER;
  v_occupancy_pct NUMERIC(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE bed.status = 'OCCUPIED')
  INTO v_total_beds, v_occupied_beds
  FROM beds bed
  JOIN rooms r ON r.id = bed.room_id
  WHERE r.pg_id = p_pg_id AND bed.deleted_at IS NULL AND r.deleted_at IS NULL;

  v_available := v_total_beds - v_occupied_beds;
  v_occupancy_pct := CASE WHEN v_total_beds > 0
                     THEN ROUND((v_occupied_beds::NUMERIC / v_total_beds) * 100, 2)
                     ELSE 0 END;

  RETURN jsonb_build_object(
    'pg_id', p_pg_id,
    'total_beds', v_total_beds,
    'occupied_beds', v_occupied_beds,
    'available_beds', v_available,
    'occupancy_percentage', v_occupancy_pct
  );
END;
$$;


-- 10c. Get tenant payment history
CREATE OR REPLACE FUNCTION get_tenant_payment_history(
  p_user_id  TEXT,
  p_limit    INTEGER DEFAULT 20,
  p_offset   INTEGER DEFAULT 0
)
RETURNS TABLE (
  payment_id    TEXT,
  pg_name       TEXT,
  amount        NUMERIC(12,2),
  type          TEXT,
  status        TEXT,
  due_date      TIMESTAMPTZ,
  paid_date     TIMESTAMPTZ,
  method        TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pay.id,
    pg.name,
    pay.amount,
    pay.type,
    pay.status,
    pay.due_date,
    pay.paid_date,
    pay.method
  FROM payments pay
  JOIN pgs pg ON pg.id = pay.pg_id
  WHERE pay.user_id = p_user_id AND pay.deleted_at IS NULL
  ORDER BY pay.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- 10d. Email validation
CREATE OR REPLACE FUNCTION is_valid_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;


-- 10e. Indian phone validation
CREATE OR REPLACE FUNCTION is_valid_indian_phone(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN p_phone ~ '^\+91[6-9]\d{9}$|^[6-9]\d{9}$';
END;
$$;


-- 10f. IFSC code validation
CREATE OR REPLACE FUNCTION is_valid_ifsc(p_ifsc TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN p_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$';
END;
$$;
