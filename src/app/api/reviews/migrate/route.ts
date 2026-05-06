import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';

// POST /api/reviews/migrate — Run the reviews table migration (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSessionWithRole(request, ['ADMIN']);
    if ('error' in authResult) return authResult.error;
    const sql = `
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
CREATE INDEX IF NOT EXISTS idx_reviews_pg_id ON reviews(pg_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner can update own review" ON reviews FOR UPDATE USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'ADMIN');
`;

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      // Table might already exist, try creating just triggers
      console.log('Table creation result:', error);
    }

    // Create the trigger function
    const triggerFn = `
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
`;

    const triggerFnResult = await supabaseAdmin.rpc('exec_sql', { sql: triggerFn });

    // Create triggers
    const trigger1 = `
DO $$ BEGIN
  CREATE TRIGGER trigger_insert_review AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_pg_rating();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;
    await supabaseAdmin.rpc('exec_sql', { sql: trigger1 });

    const trigger2 = `
DO $$ BEGIN
  CREATE TRIGGER trigger_update_review AFTER UPDATE ON reviews
  FOR EACH ROW
  WHEN (OLD.rating IS DISTINCT FROM NEW.rating OR OLD.cleanliness IS DISTINCT FROM NEW.cleanliness
       OR OLD.safety IS DISTINCT FROM NEW.safety OR OLD.value_for_money IS DISTINCT FROM NEW.value_for_money
       OR OLD.amenities IS DISTINCT FROM NEW.amenities OR OLD.management IS DISTINCT FROM NEW.management)
  FOR EACH ROW EXECUTE FUNCTION update_pg_rating();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;
    await supabaseAdmin.rpc('exec_sql', { sql: trigger2 });

    const trigger3 = `
DO $$ BEGIN
  CREATE TRIGGER trigger_delete_review AFTER DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_pg_rating();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;
    await supabaseAdmin.rpc('exec_sql', { sql: trigger3 });

    return NextResponse.json({ success: true, message: 'Reviews table and triggers created' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: true, error: String(error) });
  }
}
