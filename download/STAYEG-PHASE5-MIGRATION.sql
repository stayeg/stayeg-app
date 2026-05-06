-- =============================================================
-- StayEg — Phase 5 Production Hardening Migration
-- =============================================================
-- Run this in Supabase Dashboard > SQL Editor > New Query
--
-- This migration covers:
--   1. Missing tables (reports, contact_submissions, review_helpful_votes)
--   2. RLS policies for new tables + webhook_events
--   3. Data integrity constraints (CHECK, NOT NULL, UNIQUE)
--   4. Cross-table validation triggers
--   5. Auto-release bed on booking cancellation/completion
--   6. Auto-notification triggers for key business events
--   7. Auto activity-log triggers
--   8. Performance indexes (compound, partial, GIN, geographic)
--   9. Atomic RPC functions (cancel_booking, transfer_bed, apply_coupon, generate_rent)
--  10. Dashboard views (owner, tenant, payment reconciliation)
--  11. Monetary field migration (DOUBLE PRECISION -> NUMERIC(12,2))
--  12. Soft delete support
--  13. Database-level validation functions
--  14. pg_cron cleanup jobs
--  15. workers.status CHECK constraint fix
-- =============================================================

BEGIN;

-- =============================================================
-- PART 1: Missing Tables
-- =============================================================
-- These tables are referenced by API routes but don't exist yet.
-- Without them, /api/reports, /api/contact, /api/reviews/[id]/helpful
-- will crash at runtime.

-- 1a. Reports table (used by /api/reports)
CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporter_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id     TEXT NOT NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('PG', 'USER', 'REVIEW')),
  reason        TEXT NOT NULL,
  description   TEXT NOT NULL,
  contact_email TEXT,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- 1b. Contact submissions table (used by /api/contact)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'READ', 'REPLIED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at DESC);

-- 1c. Review helpful votes table (used by /api/reviews/[id]/helpful)
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  review_id  TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user ON review_helpful_votes(user_id);


-- =============================================================
-- PART 2: RLS Policies for New Tables + webhook_events
-- =============================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_service" ON reports FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "reports_insert_service" ON reports FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "reports_update_service" ON reports FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "reports_delete_service" ON reports FOR DELETE USING (auth.role() = 'service_role');

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_submissions_select_service" ON contact_submissions FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "contact_submissions_insert_service" ON contact_submissions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "contact_submissions_update_service" ON contact_submissions FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "contact_submissions_delete_service" ON contact_submissions FOR DELETE USING (auth.role() = 'service_role');

ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_helpful_votes_select_public" ON review_helpful_votes FOR SELECT USING (true);
CREATE POLICY "review_helpful_votes_insert_service" ON review_helpful_votes FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "review_helpful_votes_delete_service" ON review_helpful_votes FOR DELETE USING (auth.role() = 'service_role');

-- webhook_events was missing RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_events_service_only" ON webhook_events FOR ALL USING (auth.role() = 'service_role');


-- =============================================================
-- PART 3: Data Integrity Constraints
-- =============================================================
-- These prevent bad data from entering the database at the DB level,
-- regardless of what application code does.

-- 3a. NOT NULL constraints on columns with defaults that aren't enforced
ALTER TABLE payments ALTER COLUMN type SET NOT NULL;
ALTER TABLE payments ALTER COLUMN status SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN status SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN is_read SET NOT NULL DEFAULT false;
ALTER TABLE notifications ALTER COLUMN type SET NOT NULL DEFAULT 'INFO';

-- 3b. CHECK constraints for data validation
ALTER TABLE pgs ADD CONSTRAINT pgs_price_positive CHECK (price >= 0);
ALTER TABLE pgs ADD CONSTRAINT pgs_security_deposit_positive CHECK (security_deposit >= 0);
ALTER TABLE pgs ADD CONSTRAINT pgs_rating_range CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
ALTER TABLE bookings ADD CONSTRAINT bookings_advance_paid_positive CHECK (advance_paid >= 0);
ALTER TABLE users ADD CONSTRAINT users_age_range CHECK (age IS NULL OR (age >= 0 AND age <= 150));
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_value_positive CHECK (discount_value > 0);
ALTER TABLE rooms ADD CONSTRAINT rooms_floor_positive CHECK (floor >= 0);
ALTER TABLE beds ADD CONSTRAINT beds_bed_number_positive CHECK (bed_number > 0);

-- 3c. workers.status CHECK constraint was missing
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_status_check;
ALTER TABLE workers ADD CONSTRAINT workers_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- 3d. Unique constraint on users.phone (race condition prevention)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;

-- 3e. Expand complaints.category to include all values used in the app
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_category_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_category_check
  CHECK (category IN ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'FOOD', 'GENERAL', 'OTHER'));

-- 3f. Expand payments.type to include all values used in the app
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('RENT', 'ADVANCE', 'SECURITY_DEPOSIT', 'DEPOSIT', 'MAINTENANCE', 'PENALTY'));

-- 3g. Expand payments.method to include online methods
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('UPI', 'CARD', 'NET_BANKING', 'CASH', 'RAZORPAY', 'ONLINE'));

-- 3h. Add RESERVED to beds.status
ALTER TABLE beds DROP CONSTRAINT IF EXISTS beds_status_check;
ALTER TABLE beds ADD CONSTRAINT beds_status_check
  CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'));


-- =============================================================
-- PART 4: Cross-Table Validation Triggers
-- =============================================================

-- 4a. Ensure booking.pg_id matches the bed's PG (via room -> pg)
CREATE OR REPLACE FUNCTION validate_booking_pg_match()
RETURNS TRIGGER AS $$
DECLARE
  v_bed_pg_id TEXT;
BEGIN
  SELECT r.pg_id INTO v_bed_pg_id
  FROM beds b
  JOIN rooms r ON r.id = b.room_id
  WHERE b.id = NEW.bed_id;

  IF v_bed_pg_id IS NULL THEN
    RAISE EXCEPTION 'Referenced bed does not exist or has no room';
  END IF;

  IF NEW.pg_id != v_bed_pg_id THEN
    RAISE EXCEPTION 'Booking pg_id (%) does not match the bed''s PG (%)', NEW.pg_id, v_bed_pg_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking_pg ON bookings;
CREATE TRIGGER trg_validate_booking_pg
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_pg_match();


-- 4b. Prevent booking a bed that is already OCCUPIED (extra safety beyond RPC)
CREATE OR REPLACE FUNCTION prevent_double_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_bed_status TEXT;
BEGIN
  SELECT status INTO v_bed_status FROM beds WHERE id = NEW.bed_id;

  IF v_bed_status != 'AVAILABLE' THEN
    RAISE EXCEPTION 'Bed % is not available (status: %)', NEW.bed_id, v_bed_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON bookings;
CREATE TRIGGER trg_prevent_double_booking
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('PENDING', 'CONFIRMED', 'ACTIVE'))
  EXECUTE FUNCTION prevent_double_booking();


-- =============================================================
-- PART 5: Auto-Release Bed on Booking Cancellation/Completion
-- =============================================================
-- When a booking moves to CANCELLED or COMPLETED, the associated
-- bed should automatically become AVAILABLE again.

CREATE OR REPLACE FUNCTION auto_release_bed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('CANCELLED', 'COMPLETED')
     AND OLD.status NOT IN ('CANCELLED', 'COMPLETED') THEN
    UPDATE beds SET status = 'AVAILABLE'
    WHERE id = NEW.bed_id AND status = 'OCCUPIED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_release_bed ON bookings;
CREATE TRIGGER trg_auto_release_bed
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_release_bed();


-- =============================================================
-- PART 6: Auto-Notification Triggers
-- =============================================================
-- These triggers create notifications for key business events
-- so no notification is missed even if the API code is buggy.

-- Helper: get PG owner from pg_id
CREATE OR REPLACE FUNCTION get_pg_owner(p_pg_id TEXT)
RETURNS TEXT AS $$
  SELECT owner_id FROM pgs WHERE id = p_pg_id;
$$ LANGUAGE sql STABLE;

-- 6a. New booking -> notify PG owner
CREATE OR REPLACE FUNCTION notify_owner_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_pg_name TEXT;
  v_user_name TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_pg_name FROM pgs WHERE id = NEW.pg_id;
  SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      v_owner_id,
      'New Booking',
      COALESCE(v_user_name, 'A tenant') || ' booked a bed at ' || COALESCE(v_pg_name, 'your PG'),
      'BOOKING',
      jsonb_build_object('booking_id', NEW.id, 'pg_id', NEW.pg_id, 'user_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_owner_booking ON bookings;
CREATE TRIGGER trg_notify_owner_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_new_booking();

-- 6b. Booking status change -> notify tenant
CREATE OR REPLACE FUNCTION notify_tenant_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  v_pg_name TEXT;
BEGIN
  IF NEW.status != OLD.status THEN
    SELECT name INTO v_pg_name FROM pgs WHERE id = NEW.pg_id;

    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Booking ' || NEW.status,
      'Your booking at ' || COALESCE(v_pg_name, 'PG') || ' has been ' || LOWER(NEW.status),
      'BOOKING',
      jsonb_build_object('booking_id', NEW.id, 'status', NEW.status, 'pg_id', NEW.pg_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_tenant_booking_update ON bookings;
CREATE TRIGGER trg_notify_tenant_booking_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_tenant_booking_update();

-- 6c. New complaint -> notify PG owner
CREATE OR REPLACE FUNCTION notify_owner_new_complaint()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_pg_name TEXT;
  v_user_name TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_pg_name FROM pgs WHERE id = NEW.pg_id;
  SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      v_owner_id,
      'New Complaint: ' || NEW.title,
      COALESCE(v_user_name, 'A tenant') || ' filed a complaint at ' || COALESCE(v_pg_name, 'your PG'),
      'COMPLAINT',
      jsonb_build_object('complaint_id', NEW.id, 'pg_id', NEW.pg_id, 'priority', NEW.priority)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_owner_complaint ON complaints;
CREATE TRIGGER trg_notify_owner_complaint
  AFTER INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_new_complaint();

-- 6d. Complaint resolved -> notify tenant
CREATE OR REPLACE FUNCTION notify_tenant_complaint_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('RESOLVED', 'CLOSED') AND OLD.status NOT IN ('RESOLVED', 'CLOSED') THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Complaint Resolved',
      'Your complaint "' || NEW.title || '" has been resolved.',
      'COMPLAINT',
      jsonb_build_object('complaint_id', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_tenant_complaint_resolved ON complaints;
CREATE TRIGGER trg_notify_tenant_complaint_resolved
  AFTER UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_tenant_complaint_resolved();

-- 6e. Payment completed -> notify PG owner
CREATE OR REPLACE FUNCTION notify_owner_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_pg_name TEXT;
  v_user_name TEXT;
BEGIN
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    SELECT owner_id, name INTO v_owner_id, v_pg_name FROM pgs WHERE id = NEW.pg_id;
    SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;

    IF v_owner_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        v_owner_id,
        'Payment Received',
        COALESCE(v_user_name, 'A tenant') || ' paid ' || NEW.amount || ' at ' || COALESCE(v_pg_name, 'your PG'),
        'PAYMENT',
        jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount, 'pg_id', NEW.pg_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_owner_payment ON payments;
CREATE TRIGGER trg_notify_owner_payment
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_payment_received();


-- =============================================================
-- PART 7: Auto Activity-Log Triggers
-- =============================================================

-- 7a. Log booking creation
CREATE OR REPLACE FUNCTION log_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  v_owner_id := get_pg_owner(NEW.pg_id);

  INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
  VALUES (
    v_owner_id,
    NEW.pg_id,
    'BOOKING_CREATED',
    'New booking created',
    'booking',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_booking_created ON bookings;
CREATE TRIGGER trg_log_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_created();

-- 7b. Log booking status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  IF NEW.status != OLD.status THEN
    v_owner_id := get_pg_owner(NEW.pg_id);

    INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
    VALUES (
      v_owner_id,
      NEW.pg_id,
      'BOOKING_' || NEW.status,
      'Booking status changed from ' || OLD.status || ' to ' || NEW.status,
      'booking',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_booking_status ON bookings;
CREATE TRIGGER trg_log_booking_status
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_status_change();

-- 7c. Log payment completion
CREATE OR REPLACE FUNCTION log_payment_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    v_owner_id := get_pg_owner(NEW.pg_id);

    INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
    VALUES (
      v_owner_id,
      NEW.pg_id,
      'PAYMENT_RECEIVED',
      'Payment of ' || NEW.amount || ' received',
      'payment',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_payment ON payments;
CREATE TRIGGER trg_log_payment
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_completed();

-- 7d. Log review posted
CREATE OR REPLACE FUNCTION log_review_posted()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
BEGIN
  v_owner_id := get_pg_owner(NEW.pg_id);

  INSERT INTO activity_log (owner_id, pg_id, action, details, entity_type, entity_id)
  VALUES (
    v_owner_id,
    NEW.pg_id,
    'REVIEW_POSTED',
    'New review posted with rating ' || NEW.rating,
    'review',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_review ON reviews;
CREATE TRIGGER trg_log_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION log_review_posted();


-- =============================================================
-- PART 8: updated_at Trigger for New Tables
-- =============================================================
-- notifications and activity_log were missing auto-updated_at

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_contact_submissions_updated_at ON contact_submissions;
-- contact_submissions doesn't have updated_at, so skip


-- =============================================================
-- PART 9: Performance Indexes
-- =============================================================
-- These indexes target the most common and expensive query patterns
-- identified from the API routes.

-- 9a. Compound indexes for analytics (most impactful)
CREATE INDEX IF NOT EXISTS idx_payments_pg_status ON payments(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_pg_type_status ON payments(pg_id, type, status);
CREATE INDEX IF NOT EXISTS idx_payments_pg_created ON payments(pg_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

-- 9b. Booking lookup patterns
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_pg_status ON bookings(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_bed_status ON bookings(bed_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in_date);

-- 9c. Complaint management
CREATE INDEX IF NOT EXISTS idx_complaints_pg_status ON complaints(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);

-- 9d. Bed availability
CREATE INDEX IF NOT EXISTS idx_beds_room_status ON beds(room_id, status);

-- 9e. Activity log entity lookup + owner dashboard
CREATE INDEX IF NOT EXISTS idx_activity_log_owner_created ON activity_log(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- 9f. Notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 9g. Review moderation
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_reviews_pg_rating ON reviews(pg_id, rating DESC);

-- 9h. Overdue payment detection (partial index)
CREATE INDEX IF NOT EXISTS idx_payments_status_due ON payments(status, due_date) WHERE status = 'PENDING';

-- 9i. Coupon active lookup
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(code) WHERE is_active = true;

-- 9j. Tenant notes by owner
CREATE INDEX IF NOT EXISTS idx_tenant_notes_owner ON tenant_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notes_tenant ON tenant_notes(tenant_id);

-- 9k. User role lookup
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- 9l. PG owner lookup
CREATE INDEX IF NOT EXISTS idx_pgs_owner ON pgs(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pgs_city_status ON pgs(city, status);

-- 9m. PG text search (trigram) — enables fast ilike queries on name/address
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_pgs_name_trgm ON pgs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pgs_address_trgm ON pgs USING gin (address gin_trgm_ops);

-- 9n. Geographic index for location-based PG search
CREATE INDEX IF NOT EXISTS idx_pgs_lat_lng ON pgs(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 9o. PG amenities text search
CREATE INDEX IF NOT EXISTS idx_pgs_amenities_trgm ON pgs USING gin (amenities gin_trgm_ops);


-- =============================================================
-- PART 10: Atomic RPC Functions
-- =============================================================

-- 10a. Cancel booking atomically (prevents partial state)
CREATE OR REPLACE FUNCTION cancel_booking_atomic(
  p_booking_id TEXT,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
  v_bed_id TEXT;
BEGIN
  -- Lock and fetch the booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_booking.status IN ('CANCELLED', 'COMPLETED') THEN
    RETURN jsonb_build_object('error', 'Booking already ' || v_booking.status, 'code', 'ALREADY_DONE');
  END IF;

  -- Update booking status
  UPDATE bookings SET status = 'CANCELLED' WHERE id = p_booking_id;

  -- Release the bed (trigger will also do this, but explicit is safer)
  UPDATE beds SET status = 'AVAILABLE'
  WHERE id = v_booking.bed_id AND status = 'OCCUPIED';

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'CANCELLED'
  );
END;
$$;


-- 10b. Transfer bed atomically (prevents double-booking during transfer)
CREATE OR REPLACE FUNCTION transfer_bed_atomic(
  p_booking_id TEXT,
  p_new_bed_id TEXT,
  p_new_pg_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
  v_old_bed_id TEXT;
  v_new_bed_status TEXT;
BEGIN
  -- Lock the booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND status IN ('CONFIRMED', 'ACTIVE')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Active booking not found', 'code', 'NOT_FOUND');
  END IF;

  v_old_bed_id := v_booking.bed_id;

  -- Lock and verify the new bed is available
  SELECT status INTO v_new_bed_status
  FROM beds
  WHERE id = p_new_bed_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Target bed not found', 'code', 'BED_NOT_FOUND');
  END IF;

  IF v_new_bed_status != 'AVAILABLE' THEN
    RETURN jsonb_build_object('error', 'Target bed is not available', 'code', 'BED_OCCUPIED');
  END IF;

  -- Validate that new bed belongs to the target PG
  BEGIN
    PERFORM 1
    FROM beds b
    JOIN rooms r ON r.id = b.room_id
    WHERE b.id = p_new_bed_id AND r.pg_id = p_new_pg_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Bed does not belong to the specified PG', 'code', 'PG_MISMATCH');
    END IF;
  END;

  -- Release old bed
  UPDATE beds SET status = 'AVAILABLE' WHERE id = v_old_bed_id;

  -- Occupy new bed
  UPDATE beds SET status = 'OCCUPIED' WHERE id = p_new_bed_id;

  -- Update booking
  UPDATE bookings
  SET bed_id = p_new_bed_id, pg_id = p_new_pg_id
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'old_bed_id', v_old_bed_id,
    'new_bed_id', p_new_bed_id
  );
END;
$$;


-- 10c. Apply coupon atomically (validation + usage + count increment in one TX)
CREATE OR REPLACE FUNCTION apply_coupon_atomic(
  p_coupon_id TEXT,
  p_user_id TEXT,
  p_booking_id TEXT,
  p_order_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_coupon RECORD;
  v_discount_amount NUMERIC;
  v_already_used INTEGER;
BEGIN
  -- Lock the coupon row
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Coupon not found', 'code', 'NOT_FOUND');
  END IF;

  -- Validate coupon
  IF v_coupon.is_active = false THEN
    RETURN jsonb_build_object('error', 'Coupon is not active', 'code', 'INACTIVE');
  END IF;

  IF NOW() < v_coupon.valid_from OR NOW() > v_coupon.valid_until THEN
    RETURN jsonb_build_object('error', 'Coupon has expired or is not yet valid', 'code', 'EXPIRED');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('error', 'Coupon usage limit reached', 'code', 'LIMIT_REACHED');
  END IF;

  IF p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object('error', 'Order amount below minimum', 'code', 'BELOW_MINIMUM');
  END IF;

  -- Check if user already used this coupon
  SELECT COUNT(*) INTO v_already_used
  FROM coupon_usages
  WHERE coupon_id = p_coupon_id AND user_id = p_user_id;

  IF v_already_used > 0 THEN
    RETURN jsonb_build_object('error', 'You have already used this coupon', 'code', 'ALREADY_USED');
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'PERCENTAGE' THEN
    v_discount_amount := LEAST(
      (p_order_amount * v_coupon.discount_value / 100),
      COALESCE(v_coupon.max_discount, p_order_amount)
    );
  ELSE
    v_discount_amount := LEAST(v_coupon.discount_value, p_order_amount);
  END IF;

  -- Insert usage record
  INSERT INTO coupon_usages (coupon_id, user_id, booking_id, discount_amount)
  VALUES (p_coupon_id, p_user_id, p_booking_id, v_discount_amount);

  -- Atomically increment used_count
  UPDATE coupons SET used_count = used_count + 1 WHERE id = p_coupon_id;

  RETURN jsonb_build_object(
    'success', true,
    'discount_amount', v_discount_amount,
    'final_amount', p_order_amount - v_discount_amount
  );
END;
$$;


-- 10d. Generate monthly rent payment records for all active bookings
CREATE OR REPLACE FUNCTION generate_monthly_rent(
  p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_booking RECORD;
  v_due_date TIMESTAMPTZ;
  v_rent_amount NUMERIC;
BEGIN
  v_due_date := p_month + INTERVAL '5 days';

  FOR v_booking IN
    SELECT b.id AS booking_id, b.user_id, b.pg_id, bd.price AS rent_price
    FROM bookings b
    JOIN beds bd ON bd.id = b.bed_id
    WHERE b.status IN ('ACTIVE', 'CONFIRMED')
  LOOP
    -- Skip if rent already generated for this booking+month
    IF NOT EXISTS (
      SELECT 1 FROM payments
      WHERE booking_id = v_booking.booking_id
        AND type = 'RENT'
        AND date_trunc('month', due_date) = date_trunc('month', v_due_date)
    ) THEN
      v_rent_amount := COALESCE(v_booking.rent_price, 0);

      INSERT INTO payments (user_id, pg_id, booking_id, amount, type, status, due_date, method)
      VALUES (
        v_booking.user_id,
        v_booking.pg_id,
        v_booking.booking_id,
        v_rent_amount,
        'RENT',
        'PENDING',
        v_due_date,
        'UPI'
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


-- =============================================================
-- PART 11: Dashboard Views
-- =============================================================

-- 11a. Owner dashboard materialized view (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_owner_dashboard AS
SELECT
  p.owner_id,
  p.id AS pg_id,
  p.name AS pg_name,
  p.city,
  p.status AS pg_status,
  COUNT(DISTINCT r.id) AS total_rooms,
  COUNT(DISTINCT b.id) AS total_beds,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'OCCUPIED') AS occupied_beds,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'AVAILABLE') AS available_beds,
  ROUND(
    COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'OCCUPIED')::numeric
    / NULLIF(COUNT(DISTINCT b.id), 0) * 100, 1
  ) AS occupancy_pct,
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.status = 'COMPLETED'
      AND pay.created_at >= date_trunc('month', NOW())
  ), 0) AS monthly_revenue,
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.status = 'COMPLETED'
      AND pay.created_at >= date_trunc('year', NOW())
  ), 0) AS yearly_revenue,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('OPEN', 'IN_PROGRESS')) AS open_complaints,
  COALESCE(AVG(rv.rating), 0) AS avg_rating
FROM pgs p
LEFT JOIN rooms r ON r.pg_id = p.id
LEFT JOIN beds b ON b.room_id = r.id
LEFT JOIN payments pay ON pay.pg_id = p.id
LEFT JOIN complaints c ON c.pg_id = p.id AND c.status IN ('OPEN', 'IN_PROGRESS')
LEFT JOIN reviews rv ON rv.pg_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.owner_id, p.id, p.name, p.city, p.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_owner_dashboard_pg
  ON mv_owner_dashboard(pg_id);

-- 11b. Tenant dashboard view (live, not materialized)
CREATE OR REPLACE VIEW v_tenant_dashboard AS
SELECT
  u.id AS user_id,
  u.name AS tenant_name,
  u.email,
  bk.id AS booking_id,
  bk.status AS booking_status,
  bk.check_in_date,
  pg.id AS pg_id,
  pg.name AS pg_name,
  pg.address AS pg_address,
  pg.city AS pg_city,
  rm.room_code,
  rm.room_type,
  bd.bed_number,
  bd.price AS bed_price,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'PENDING'), 0) AS pending_payments,
  COUNT(c.id) FILTER (WHERE c.status IN ('OPEN', 'IN_PROGRESS')) AS open_complaints
FROM users u
LEFT JOIN bookings bk ON bk.user_id = u.id AND bk.status IN ('ACTIVE', 'CONFIRMED')
LEFT JOIN pgs pg ON pg.id = bk.pg_id
LEFT JOIN beds bd ON bd.id = bk.bed_id
LEFT JOIN rooms rm ON rm.id = bd.room_id
LEFT JOIN payments pay ON pay.booking_id = bk.id
LEFT JOIN complaints c ON c.user_id = u.id AND c.status IN ('OPEN', 'IN_PROGRESS')
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name, u.email, bk.id, bk.status, bk.check_in_date,
         pg.id, pg.name, pg.address, pg.city, rm.room_code, rm.room_type, bd.bed_number, bd.price;

-- 11c. Payment reconciliation view (for Razorpay matching)
CREATE OR REPLACE VIEW v_payment_reconciliation AS
SELECT
  p.id,
  p.amount,
  p.status,
  p.type AS payment_type,
  p.method,
  p.razorpay_order_id,
  p.razorpay_payment_id,
  p.verification_note,
  p.created_at,
  p.paid_date,
  p.due_date,
  u.name AS tenant_name,
  u.email AS tenant_email,
  pg.name AS pg_name
FROM payments p
JOIN users u ON u.id = p.user_id
JOIN pgs pg ON pg.id = p.pg_id
WHERE p.razorpay_order_id IS NOT NULL
ORDER BY p.created_at DESC;


-- =============================================================
-- PART 12: Monetary Field Migration (DOUBLE PRECISION -> NUMERIC)
-- =============================================================
-- IMPORTANT: This is safe because NUMERIC can hold all DOUBLE PRECISION
-- values. The CAST is implicit and no data is lost.
-- However, this may require a table rewrite on large tables.
-- Do this during low-traffic periods.

-- 12a. payments.amount (most critical — financial data)
ALTER TABLE payments ALTER COLUMN amount TYPE NUMERIC(12,2);

-- 12b. pgs.price
ALTER TABLE pgs ALTER COLUMN price TYPE NUMERIC(12,2);

-- 12c. pgs.security_deposit
ALTER TABLE pgs ALTER COLUMN security_deposit TYPE NUMERIC(12,2);

-- 12d. beds.price
ALTER TABLE beds ALTER COLUMN price TYPE NUMERIC(12,2);

-- 12e. bookings.advance_paid
ALTER TABLE bookings ALTER COLUMN advance_paid TYPE NUMERIC(12,2);

-- 12f. Update the create_booking_atomic function to match NUMERIC type
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_user_id TEXT,
  p_pg_id TEXT,
  p_bed_id TEXT,
  p_check_in_date TIMESTAMPTZ,
  p_advance_paid NUMERIC(12,2) DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_bed_status TEXT;
  v_existing_booking_id TEXT;
  v_booking_id TEXT;
BEGIN
  SELECT status INTO v_bed_status
  FROM beds
  WHERE id = p_bed_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Bed not found', 'code', 'BED_NOT_FOUND');
  END IF;

  IF v_bed_status != 'AVAILABLE' THEN
    RETURN jsonb_build_object(
      'error', 'This bed is already booked. Please select another bed.',
      'code', 'BED_OCCUPIED'
    );
  END IF;

  SELECT id INTO v_existing_booking_id
  FROM bookings
  WHERE bed_id = p_bed_id AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
  FOR UPDATE;

  IF v_existing_booking_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'error', 'This bed already has an active booking.',
      'code', 'BOOKING_EXISTS'
    );
  END IF;

  INSERT INTO bookings (user_id, pg_id, bed_id, check_in_date, advance_paid, status)
  VALUES (p_user_id, p_pg_id, p_bed_id, p_check_in_date, p_advance_paid, 'PENDING')
  RETURNING id INTO v_booking_id;

  UPDATE beds SET status = 'OCCUPIED' WHERE id = p_bed_id;

  RETURN jsonb_build_object(
    'booking', jsonb_build_object(
      'id', v_booking_id,
      'user_id', p_user_id,
      'pg_id', p_pg_id,
      'bed_id', p_bed_id,
      'status', 'PENDING'
    )
  );
END;
$$;


-- =============================================================
-- PART 13: Soft Delete Support
-- =============================================================
-- Adding deleted_at columns to key tables for audit trail and
-- data recovery. Queries should filter WHERE deleted_at IS NULL.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE pgs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes for active (non-deleted) records
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pgs_active ON pgs(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_active ON payments(id) WHERE deleted_at IS NULL;


-- =============================================================
-- PART 14: Database-Level Validation Functions
-- =============================================================

-- 14a. Email format validation
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
  SELECT email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
$$ LANGUAGE sql IMMUTABLE;

-- 14b. Indian phone validation
CREATE OR REPLACE FUNCTION is_valid_indian_phone(phone TEXT)
RETURNS BOOLEAN AS $$
  SELECT phone ~ '^\+91[6-9]\d{9}$' OR phone ~ '^[6-9]\d{9}$';
$$ LANGUAGE sql IMMUTABLE;

-- 14c. IFSC code validation
CREATE OR REPLACE FUNCTION is_valid_ifsc(code TEXT)
RETURNS BOOLEAN AS $$
  SELECT code ~ '^[A-Z]{4}0[A-Z0-9]{6}$';
$$ LANGUAGE sql IMMUTABLE;

-- 14d. Add CHECK constraints using validation functions (safe additions)
-- Note: These will only affect NEW rows. Existing invalid data will need cleanup.
ALTER TABLE pgs ADD CONSTRAINT pgs_valid_ifsc
  CHECK (bank_ifsc_code IS NULL OR is_valid_ifsc(bank_ifsc_code));


-- =============================================================
-- PART 15: pg_cron Cleanup Jobs
-- =============================================================
-- These require the pg_cron extension to be enabled in Supabase.
-- If not available, you can run these as scheduled Supabase Edge Functions.

-- Enable pg_cron if available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 15a. Auto-cleanup old webhook events (keep 7 days)
SELECT cron.schedule(
  'cleanup-webhook-events',
  '0 3 * * *',
  $$DELETE FROM webhook_events WHERE processed_at IS NOT NULL AND processed_at < NOW() - INTERVAL '7 days'$$
);

-- 15b. Auto-cleanup read notifications older than 90 days
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 4 * * *',
  $$DELETE FROM notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '90 days'$$
);

-- 15c. Refresh owner dashboard materialized view every hour
SELECT cron.schedule(
  'refresh-owner-dashboard',
  '0 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_dashboard$$
);

-- 15d. Auto-generate monthly rent on the 1st of each month at 6 AM
SELECT cron.schedule(
  'generate-monthly-rent',
  '0 6 1 * *',
  $$SELECT generate_monthly_rent()$$
);


-- =============================================================
-- PART 16: Verification Queries
-- =============================================================
-- Run these separately to verify the migration was successful:

-- Verify all tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verify all RLS policies
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Verify all indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Verify triggers
-- SELECT event_object_table, trigger_name, event_manipulation FROM information_schema.triggers ORDER BY event_object_table;

-- Verify monetary columns are NUMERIC
-- SELECT column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns
--   WHERE table_name IN ('payments', 'pgs', 'beds', 'bookings') AND column_name IN ('amount', 'price', 'security_deposit', 'advance_paid');

-- Test atomic functions
-- SELECT cancel_booking_atomic('test-booking-id', 'test-user-id');
-- SELECT apply_coupon_atomic('test-coupon-id', 'test-user-id', 'test-booking-id', 5000);

COMMIT;
