-- Reviews table for StayEg PG platform
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id           UUID NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  cleanliness     INTEGER NOT NULL DEFAULT 3 CHECK (cleanliness >= 1 AND cleanliness <= 5),
  safety          INTEGER NOT NULL DEFAULT 3 CHECK (safety >= 1 AND safety <= 5),
  value_for_money INTEGER NOT NULL DEFAULT 3 CHECK (value_for_money >= 1 AND value_for_money <= 5),
  amenities       INTEGER NOT NULL DEFAULT 3 CHECK (amenities >= 1 AND amenities <= 5),
  management      INTEGER NOT NULL DEFAULT 3 CHECK (management >= 1 AND management <= 5),
  comment         TEXT NOT NULL DEFAULT '',
  helpful_count    INTEGER NOT NULL DEFAULT 0,
  is_flagged       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_pg_id ON reviews(pg_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);

-- Policy: Authenticated users can insert reviews
CREATE POLICY "Authenticated users can insert" ON reviews FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Policy: Review owner or admin can update
CREATE POLICY "Owner can update own review" ON reviews FOR UPDATE USING (
  auth.uid() = user_id OR auth.jwt() ->> 'role' = 'ADMIN'
);

-- Trigger: Update PG rating averages on review insert/update/delete
CREATE OR REPLACE FUNCTION update_pg_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DOUBLE PRECISION;
  total_count INTEGER;
BEGIN
  SELECT ROUND(AVG(rating)::numeric, 1), COUNT(*)
  INTO avg_rating, total_count
  FROM reviews WHERE pg_id = NEW.pg_id;

  UPDATE pgs
  SET rating = COALESCE(avg_rating, 0),
      total_reviews = total_count,
      updated_at = NOW()
  WHERE id = NEW.pg_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_insert_review AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_pg_rating();

CREATE TRIGGER trigger_update_review AFTER UPDATE ON reviews
  FOR EACH ROW
  WHEN (OLD.rating IS DISTINCT FROM NEW.rating OR OLD.cleanliness IS DISTINCT FROM NEW.cleanliness
       OR OLD.safety IS DISTINCT FROM NEW.safety OR OLD.value_for_money IS DISTINCT FROM NEW.value_for_money
       OR OLD.amenities IS DISTINCT FROM NEW.amenities OR OLD.management IS DISTINCT FROM NEW.management)
  FOR EACH ROW EXECUTE FUNCTION update_pg_rating();

CREATE TRIGGER trigger_delete_review AFTER DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_pg_rating();
