-- =====================================================
-- StayeG - Owner Features Migration
-- =====================================================

-- Tenant Notes Table
CREATE TABLE IF NOT EXISTS tenant_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  pg_id TEXT NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_notes_owner ON tenant_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notes_tenant ON tenant_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notes_pg ON tenant_notes(pg_id);

-- Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id TEXT REFERENCES pgs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_owner ON activity_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_pg ON activity_log(pg_id);

-- Add notes column to payments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'notes') THEN
    ALTER TABLE payments ADD COLUMN notes TEXT;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE tenant_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant notes readable by all" ON tenant_notes FOR SELECT USING (true);
CREATE POLICY "Tenant notes insertable by all" ON tenant_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant notes updatable by all" ON tenant_notes FOR UPDATE USING (true);
CREATE POLICY "Tenant notes deletable by all" ON tenant_notes FOR DELETE USING (true);

CREATE POLICY "Activity log readable by all" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Activity log insertable by all" ON activity_log FOR INSERT WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_tenant_notes_updated_at BEFORE UPDATE ON tenant_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_activity_log_updated_at BEFORE UPDATE ON activity_log FOR EACH ROW EXECUTE FUNCTION update_updated_at();
