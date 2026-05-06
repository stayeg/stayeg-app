-- ============================================================
-- StayEg Phase 5 — Performance Indexes & Webhook Idempotency
-- ============================================================
-- Run this migration in Supabase SQL Editor.
-- This adds critical database indexes and the webhook_events
-- table for idempotent webhook processing.
-- ============================================================

-- 1. Payments indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_pg_id ON payments(pg_id);

-- 2. Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg_id ON bookings(pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_bed_id ON bookings(bed_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 3. Rooms unique constraint + index
CREATE INDEX IF NOT EXISTS idx_rooms_pg_id ON rooms(pg_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_room_code_pg_id ON rooms(room_code, pg_id);

-- 4. Beds unique constraint + index
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_bed_number_room_id ON beds(bed_number, room_id);

-- 5. Complaints indexes
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_pg_id ON complaints(pg_id);

-- 6. Notifications compound index (for unread count queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- 7. Users phone index (for OTP lookups)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 8. PGs compound index (for filtered city listings)
CREATE INDEX IF NOT EXISTS idx_pgs_city_status ON pgs(city, status);
CREATE INDEX IF NOT EXISTS idx_pgs_owner_id ON pgs(owner_id);

-- 9. Activity log compound index (for owner log queries)
CREATE INDEX IF NOT EXISTS idx_activity_log_owner_created ON activity_log(owner_id, created_at DESC);

-- 10. Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_pg_id ON reviews(pg_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- 11. Webhook events table (for idempotency tracking)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup: Delete webhook events older than 7 days
-- (Run periodically via pg_cron or manually)
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

-- 12. Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);

-- 13. Workers index
CREATE INDEX IF NOT EXISTS idx_workers_pg_id ON workers(pg_id);

-- ============================================================
-- Verification queries (run these after migration to confirm)
-- ============================================================
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
