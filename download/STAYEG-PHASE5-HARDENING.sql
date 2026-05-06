-- =============================================================
-- StayEg — Phase 5: Database Hardening Migration
-- =============================================================
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- AFTER running PRODUCTION SETUP and Phase 2 Security.
--
-- CRITICAL ORDERING:
--   1. Missing tables          (Parts 1-2)
--   2. Constraints             (Part 3)
--   3. Cross-table triggers    (Part 4)
--   4. Auto-release bed        (Part 5)
--   5. Auto-notifications      (Part 6)
--   6. Activity-log triggers   (Part 7)
--   7. Performance indexes     (Part 8)
--   8. Atomic RPCs             (Part 9)
--   9. Soft delete columns     (Part 10)  ← BEFORE views
--  10. Monetary type migration (Part 11)  ← BEFORE views (fixes the ALTER error)
--  11. Dashboard views         (Part 12)  ← AFTER soft delete + monetary
--  12. Validation functions    (Part 13)
-- =============================================================


-- =============================================================
-- PART 1: Create missing tables
-- =============================================================

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


-- =============================================================
-- PART 2: RLS for new tables
-- =============================================================

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_notices ENABLE ROW LEVEL SECURITY;

-- Expense Categories: service_role only
CREATE POLICY "expense_categories_select_service" ON expense_categories FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "expense_categories_insert_service" ON expense_categories FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "expense_categories_update_service" ON expense_categories FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "expense_categories_delete_service" ON expense_categories FOR DELETE USING (auth.role() = 'service_role');

-- Expenses: service_role only
CREATE POLICY "expenses_select_service" ON expenses FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "expenses_insert_service" ON expenses FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "expenses_update_service" ON expenses FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "expenses_delete_service" ON expenses FOR DELETE USING (auth.role() = 'service_role');

-- Maintenance Requests: service_role only
CREATE POLICY "maintenance_requests_select_service" ON maintenance_requests FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "maintenance_requests_insert_service" ON maintenance_requests FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "maintenance_requests_update_service" ON maintenance_requests FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "maintenance_requests_delete_service" ON maintenance_requests FOR DELETE USING (auth.role() = 'service_role');

-- Leave Notices: service_role only
CREATE POLICY "leave_notices_select_service" ON leave_notices FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "leave_notices_insert_service" ON leave_notices FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "leave_notices_update_service" ON leave_notices FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "leave_notices_delete_service" ON leave_notices FOR DELETE USING (auth.role() = 'service_role');

-- Triggers for updated_at on new tables
CREATE TRIGGER tr_expenses_uat BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_maintenance_requests_uat BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_leave_notices_uat BEFORE UPDATE ON leave_notices FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================
-- PART 3: Additional constraints
-- =============================================================

-- Ensure bookings have a check-in date in the past or today (no future-only constraint, just NOT NULL)
-- Already set in table definition: check_in_date TIMESTAMPTZ NOT NULL

-- Ensure payment amounts are positive
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);

-- Ensure booking advance is non-negative
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_advance_nonneg CHECK (advance_paid >= 0);

-- Ensure PG price is non-negative
ALTER TABLE pgs ADD CONSTRAINT chk_pgs_price_nonneg CHECK (price >= 0);
ALTER TABLE pgs ADD CONSTRAINT chk_pgs_deposit_nonneg CHECK (security_deposit >= 0);

-- Ensure review ratings are valid (already in table, but add comment constraint)
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_comment_length CHECK (length(comment) <= 2000);

-- Ensure expense amounts are positive
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0);

-- Ensure leave notice dates make sense
ALTER TABLE leave_notices ADD CONSTRAINT chk_leave_intended_after_notice CHECK (intended_leave >= notice_date);


-- =============================================================
-- PART 4: Cross-table triggers
-- =============================================================

-- 4a. When a booking status changes to COMPLETED or CANCELLED, release the bed
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

DROP TRIGGER IF EXISTS tr_release_bed_on_close ON bookings;
CREATE TRIGGER tr_release_bed_on_close
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION release_bed_on_booking_close();


-- 4b. When a new booking is created, ensure bed is marked OCCUPIED
CREATE OR REPLACE FUNCTION occupy_bed_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('PENDING', 'CONFIRMED', 'ACTIVE') THEN
    UPDATE beds SET status = 'OCCUPIED' WHERE id = NEW.bed_id AND status = 'AVAILABLE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_occupy_bed_on_booking ON bookings;
CREATE TRIGGER tr_occupy_bed_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION occupy_bed_on_booking();


-- =============================================================
-- PART 5: Auto-release expired reserved beds
-- =============================================================

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


-- =============================================================
-- PART 6: Auto-notification triggers
-- =============================================================

-- 6a. Notify owner when a new booking is created
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

DROP TRIGGER IF EXISTS tr_notify_owner_booking ON bookings;
CREATE TRIGGER tr_notify_owner_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_booking();


-- 6b. Notify tenant when payment is overdue (checked on payment update)
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

DROP TRIGGER IF EXISTS tr_notify_overdue_payment ON payments;
CREATE TRIGGER tr_notify_overdue_payment
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_tenant_overdue_payment();


-- 6c. Notify tenant on complaint status change
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

DROP TRIGGER IF EXISTS tr_notify_complaint_update ON complaints;
CREATE TRIGGER tr_notify_complaint_update
  AFTER UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_tenant_complaint_update();


-- =============================================================
-- PART 7: Activity-log triggers
-- =============================================================

-- 7a. Log booking status changes
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

DROP TRIGGER IF EXISTS tr_log_booking_activity ON bookings;
CREATE TRIGGER tr_log_booking_activity
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_booking_activity();


-- 7b. Log payment completions
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

DROP TRIGGER IF EXISTS tr_log_payment_activity ON payments;
CREATE TRIGGER tr_log_payment_activity
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_payment_activity();


-- 7c. Log new complaints
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

DROP TRIGGER IF EXISTS tr_log_complaint_activity ON complaints;
CREATE TRIGGER tr_log_complaint_activity
  AFTER INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION log_complaint_activity();


-- =============================================================
-- PART 8: Performance indexes (additional)
-- =============================================================

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookings_user_pg ON bookings(user_id, pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg_status ON bookings(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_pg ON payments(user_id, pg_id);
CREATE INDEX IF NOT EXISTS idx_payments_pg_status ON payments(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_complaints_pg_status ON complaints(pg_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority) WHERE priority IN ('HIGH', 'URGENT');

-- New table indexes
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

-- Activity log compound indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_owner_pg ON activity_log(owner_id, pg_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Notifications compound index for "unread count" queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;


-- =============================================================
-- PART 9: Atomic RPC functions
-- =============================================================

-- 9a. Record a payment (idempotent by razorpay_payment_id)
CREATE OR REPLACE FUNCTION record_payment_atomic(
  p_user_id           TEXT,
  p_pg_id             TEXT,
  p_booking_id        TEXT,
  p_amount            DOUBLE PRECISION,
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
  -- Idempotency: if razorpay_payment_id provided, check for duplicate
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

  -- Insert the payment
  INSERT INTO payments (user_id, pg_id, booking_id, amount, type, status, method, paid_date, razorpay_order_id, razorpay_payment_id)
  VALUES (p_user_id, p_pg_id, p_booking_id, p_amount, p_type, 'COMPLETED', p_method, NOW(), p_razorpay_order_id, p_razorpay_payment_id)
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'payment', jsonb_build_object('id', v_payment_id),
    'status', 'CREATED'
  );
END;
$$;


-- 9b. Cancel booking (atomic: cancel + release bed + log)
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

  -- Cancel the booking
  UPDATE bookings
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- Release the bed
  UPDATE beds SET status = 'AVAILABLE', updated_at = NOW()
  WHERE id = v_booking.bed_id AND status = 'OCCUPIED';

  RETURN jsonb_build_object(
    'bookingId', p_booking_id,
    'bedId', v_booking.bed_id,
    'status', 'CANCELLED'
  );
END;
$$;


-- 9c. Complete booking (atomic: complete + release bed + log)
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

  -- Complete the booking
  UPDATE bookings
  SET status = 'COMPLETED',
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- Release the bed
  UPDATE beds SET status = 'AVAILABLE', updated_at = NOW()
  WHERE id = v_booking.bed_id AND status = 'OCCUPIED';

  RETURN jsonb_build_object(
    'bookingId', p_booking_id,
    'bedId', v_booking.bed_id,
    'status', 'COMPLETED'
  );
END;
$$;


-- =============================================================
-- PART 10: Soft delete columns (BEFORE dashboard views)
-- =============================================================
-- Dashboard views will reference these columns, so they MUST exist
-- before the views are created.

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

-- Indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pgs_deleted ON pgs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NOT NULL;


-- =============================================================
-- PART 11: Monetary type migration (BEFORE dashboard views)
-- =============================================================
-- IMPORTANT: This MUST run before dashboard views are created,
-- because the views reference payments.amount and pgs.price.
-- PostgreSQL does not allow ALTER COLUMN TYPE on a column
-- that is referenced by a view.

-- Change monetary columns from DOUBLE PRECISION to NUMERIC(12,2)
-- for accurate financial calculations (no floating-point errors)

ALTER TABLE pgs ALTER COLUMN price TYPE NUMERIC(12,2);
ALTER TABLE pgs ALTER COLUMN security_deposit TYPE NUMERIC(12,2);
ALTER TABLE beds ALTER COLUMN price TYPE NUMERIC(12,2);
ALTER TABLE bookings ALTER COLUMN advance_paid TYPE NUMERIC(12,2);
ALTER TABLE payments ALTER COLUMN amount TYPE NUMERIC(12,2);
ALTER TABLE expenses ALTER COLUMN amount TYPE NUMERIC(12,2);


-- =============================================================
-- PART 12: Dashboard views (AFTER soft delete + monetary migration)
-- =============================================================
-- These views are created AFTER:
--   - Soft delete columns exist (Part 10)
--   - Monetary columns are NUMERIC(12,2) (Part 11)
-- so there are no dependency conflicts.

-- 12a. Owner dashboard view
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


-- 12b. Tenant dashboard view
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


-- 12c. Payment summary view
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


-- 12d. Bed availability view
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
-- PART 13: Validation helper functions
-- =============================================================

-- 13a. Validate coupon before applying
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
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = p_code AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon code');
  END IF;

  -- Check validity dates
  IF v_coupon.valid_from > NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon is not yet active');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;

  -- Check usage limit
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;

  -- Check minimum order amount
  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum order amount is Rs. ' || v_coupon.min_order_amount);
  END IF;

  -- Check if user already used this coupon for this booking context
  SELECT COUNT(*) INTO v_usage_count
  FROM coupon_usages
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_usage_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  -- Calculate discount
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


-- 13b. Get PG occupancy stats
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


-- 13c. Get tenant payment history
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


-- =============================================================
-- DONE! Phase 5 Hardening complete.
-- =============================================================
-- Verify by running:
-- SELECT * FROM v_owner_dashboard LIMIT 5;
-- SELECT * FROM v_tenant_dashboard LIMIT 5;
-- SELECT * FROM v_payment_summary LIMIT 5;
-- SELECT * FROM v_bed_availability LIMIT 5;
