'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, CheckCircle2, AlertTriangle, Copy, Check, ExternalLink,
  RefreshCw, Shield, Server, Zap, ArrowRight, Loader2,
  ChevronDown, ChevronUp, PartyPopper, Table2, Sprout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// ── Types ──────────────────────────────────────────────────────────
interface TableDetail {
  name: string;
  exists: boolean;
  count: number;
}

interface SetupResponse {
  setup: boolean;
  connected: boolean;
  tables: string[];
  missing: string[];
  tableDetails?: TableDetail[];
  stats: Record<string, number> | null;
  message: string;
  error?: string;
}

// ── Full SQL (self-contained, includes indexes, RLS, triggers) ─────
const FULL_SQL = `-- =============================================
-- StayEg v1.2 — Full Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'TENANT' CHECK (role IN ('TENANT', 'OWNER', 'ADMIN', 'VENDOR')),
  avatar TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  is_verified BOOLEAN DEFAULT false,
  kyc_doc TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PGs table
CREATE TABLE IF NOT EXISTS pgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'UNISEX')),
  price INTEGER NOT NULL,
  security_deposit INTEGER DEFAULT 0,
  amenities TEXT,
  images TEXT,
  rating DOUBLE PRECISION DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES pgs(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY')),
  floor INTEGER DEFAULT 1,
  has_ac BOOLEAN DEFAULT false,
  has_attached_bath BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Beds table
CREATE TABLE IF NOT EXISTS beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number INTEGER NOT NULL,
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED')),
  price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  check_in_date TIMESTAMPTZ,
  check_out_date TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  advance_paid INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT DEFAULT 'RENT' CHECK (type IN ('RENT', 'DEPOSIT', 'MAINTENANCE', 'PENALTY', 'REFUND')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  method TEXT CHECK (method IN ('UPI', 'CARD', 'NET_BANKING', 'CASH', 'CHEQUE', null)),
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'FOOD', 'OTHER')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('PLUMBER', 'ELECTRICIAN', 'CLEANER', 'PAINTER', 'CARPENTER', 'WIFI', 'GENERAL')),
  phone TEXT,
  email TEXT,
  city TEXT,
  area TEXT,
  rating DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('SECURITY', 'CLEANER', 'COOK', 'MANAGER', 'MAINTENANCE')),
  phone TEXT,
  pg_id UUID REFERENCES pgs(id) ON DELETE SET NULL,
  shift TEXT CHECK (shift IN ('MORNING', 'EVENING', 'NIGHT')),
  salary INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pgs_owner_id ON pgs(owner_id);
CREATE INDEX IF NOT EXISTS idx_pgs_city ON pgs(city);
CREATE INDEX IF NOT EXISTS idx_pgs_status ON pgs(status);
CREATE INDEX IF NOT EXISTS idx_pgs_gender ON pgs(gender);
CREATE INDEX IF NOT EXISTS idx_pgs_price ON pgs(price);
CREATE INDEX IF NOT EXISTS idx_rooms_pg_id ON rooms(pg_id);
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pg_id ON bookings(pg_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(bookings_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_pg_id ON complaints(pg_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_workers_pg_id ON workers(pg_id);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);

-- ============================================
-- ROW LEVEL SECURITY (permissive for MVP)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Public read users" ON users FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public insert users" ON users FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public update users" ON users FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read pgs" ON pgs FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public insert pgs" ON pgs FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public update pgs" ON pgs FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public delete pgs" ON pgs FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all rooms" ON rooms FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all beds" ON beds FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all bookings" ON bookings FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all payments" ON payments FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all complaints" ON complaints FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all vendors" ON vendors FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public all workers" ON workers FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER pgs_updated_at BEFORE UPDATE ON pgs FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

// ── Table icons for display ────────────────────────────────────────
const TABLE_ICONS: Record<string, { icon: string; color: string }> = {
  users:   { icon: '👥', color: 'bg-blue-100 text-blue-700' },
  pgs:     { icon: '🏠', color: 'bg-brand-teal/15 text-brand-teal' },
  rooms:   { icon: '🚪', color: 'bg-purple-100 text-purple-700' },
  beds:    { icon: '🛏️', color: 'bg-amber-100 text-amber-700' },
  bookings:{ icon: '📋', color: 'bg-green-100 text-green-700' },
  payments:{ icon: '💳', color: 'bg-rose-100 text-rose-700' },
  complaints:{ icon: '📢', color: 'bg-orange-100 text-orange-700' },
  vendors: { icon: '🔧', color: 'bg-brand-sage/15 text-brand-sage' },
  workers: { icon: '👷', color: 'bg-cyan-100 text-cyan-700' },
};

// ── Main Component ─────────────────────────────────────────────────
export default function DatabaseSetupV2() {
  const [status, setStatus] = useState<SetupResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [autoSetting, setAutoSetting] = useState(false);
  const [autoResult, setAutoResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const ADMIN_SECRET = 'stayeg-v1.2-secure-2025';

  const checkStatus = useCallback(async () => {
    try {
      setChecking(true);
      const res = await fetch('/api/setup');
      const data: SetupResponse = await res.json();
      setStatus(data);
    } catch {
      setStatus({
        setup: false,
        connected: false,
        tables: [],
        missing: ['users', 'pgs', 'rooms', 'beds', 'bookings', 'payments', 'complaints', 'vendors', 'workers'],
        message: 'Could not reach the server. Make sure the app is running.',
        stats: null,
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(FULL_SQL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = FULL_SQL;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSeedResult({ success: true, message: data.message || 'Database seeded successfully!' });
        // Refresh status after seeding
        setTimeout(() => checkStatus(), 1000);
      } else {
        setSeedResult({ success: false, message: data.error || 'Seed failed.' });
      }
    } catch {
      setSeedResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSeeding(false);
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/rgkbkdxfekslaygvjngm/sql/new', '_blank');
  };

  const handleAutoSetup = async () => {
    setAutoSetting(true);
    setAutoResult(null);
    try {
      const res = await fetch('/api/setup/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      });
      const data = await res.json();
      if (data.success) {
        setAutoResult({ success: true, message: data.message || 'Database setup completed!' });
        setTimeout(() => checkStatus(), 2000);
      } else {
        const detail = data.steps?.map((s: { step: string; status: string; message: string }) => `${s.step}: ${s.status}`).join('\n');
        setAutoResult({ success: false, message: data.message || 'Auto-setup failed.', details: detail });
      }
    } catch {
      setAutoResult({ success: false, message: 'Network error. Try the manual setup below.' });
    } finally {
      setAutoSetting(false);
    }
  };

  // ── Loading state ──
  if (checking && !status) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-brand-teal/20 border-t-brand-teal"
            />
            <Database className="absolute inset-0 m-auto w-7 h-7 text-brand-teal" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Checking database connection...</p>
        </motion.div>
      </div>
    );
  }

  const isConnected = status?.connected ?? false;
  const allTablesReady = status?.setup ?? false;
  const existingTables = status?.tables ?? [];
  const missingTables = status?.missing ?? [];
  const totalTables = 9;
  const progressPct = Math.round((existingTables.length / totalTables) * 100);
  const tableDetails = status?.tableDetails ?? [];

  // Determine current step (0-indexed)
  const currentStep = !isConnected ? 0 : allTablesReady ? 4 : existingTables.length > 0 ? 3 : 1;

  return (
    <div className="min-h-[70vh] px-4 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* ── Header ── */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-deep to-brand-teal rounded-2xl flex items-center justify-center shadow-lg"
          >
            <Database className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Database Setup Guide</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Follow these simple steps to set up your StayEg database. No technical skills needed!
          </p>
        </div>

        {/* ── Status Banner ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden border-2">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0 ${
                  allTablesReady
                    ? 'bg-green-100'
                    : isConnected
                      ? 'bg-amber-100'
                      : 'bg-red-100'
                }`}>
                  {allTablesReady ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : isConnected ? (
                    <Zap className="w-5 h-5 text-amber-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={allTablesReady ? 'default' : isConnected ? 'secondary' : 'destructive'} className="text-xs">
                      {allTablesReady ? '✅ All Ready' : isConnected ? '⚡ Connected' : '❌ Not Connected'}
                    </Badge>
                    {status?.message && (
                      <p className="text-xs text-muted-foreground">{status.message}</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{existingTables.length} of {totalTables} tables</span>
                      <span className="font-medium text-foreground">{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                  </div>

                  {/* Quick table overview */}
                  {tableDetails.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
                      {tableDetails.map((t) => {
                        const meta = TABLE_ICONS[t.name] || { icon: '📄', color: 'bg-muted' };
                        return (
                          <div
                            key={t.name}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                              t.exists
                                ? 'bg-green-50'
                                : 'bg-red-50'
                            }`}
                          >
                            <span>{meta.icon}</span>
                            <span className="truncate font-medium text-foreground">{t.name}</span>
                            {t.exists ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 ml-auto" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 ml-auto" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Refresh button */}
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkStatus}
                  disabled={checking}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── If already setup ── */}
        {allTablesReady && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-5 text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
                  className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <PartyPopper className="w-8 h-8 text-green-600" />
                </motion.div>
                <h2 className="text-lg font-bold text-foreground">🎉 Database is Ready!</h2>
                <p className="text-sm text-muted-foreground">
                  Your StayEg database is fully set up with all 9 tables.
                  {status?.stats && (
                    <span className="block mt-2 text-xs">
                      {Object.entries(status.stats)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </span>
                  )}
                </p>
                {missingTables.length === 0 && !status?.stats && (
                  <div className="pt-2">
                    <Button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                    >
                      {seeding ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding...</>
                      ) : (
                        <><Sprout className="w-4 h-4 mr-2" /> Seed Sample Data</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Setup Steps ── */}
        {!allTablesReady && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-4">

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-0 px-4">
              {[
                { num: 1, label: 'Copy SQL' },
                { num: 2, label: 'Run in Supabase' },
                { num: 3, label: 'Seed Data' },
                { num: 4, label: 'Done!' },
              ].map((s, i) => {
                const isComplete = currentStep > s.num;
                const isNow = currentStep === s.num;
                return (
                  <div key={s.num} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={isNow ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isNow
                              ? 'bg-gradient-to-br from-brand-deep to-brand-teal text-white shadow-md'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isComplete ? <Check className="w-4 h-4" /> : s.num}
                      </motion.div>
                      <span className={`text-[10px] mt-1 font-medium transition-colors ${
                        isComplete || isNow ? 'text-foreground' : 'text-muted-foreground'
                      }`}>{s.label}</span>
                    </div>
                    {i < 3 && (
                      <div className={`w-8 sm:w-14 h-0.5 mb-5 mx-1 transition-colors duration-300 ${
                        currentStep > s.num ? 'bg-green-500' : 'bg-border'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 0: Auto Setup */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-2 border-brand-teal/30 bg-gradient-to-br from-brand-teal/5 to-transparent">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">One-Click Auto Setup</h3>
                      <p className="text-xs text-muted-foreground">Automatically creates all tables and seeds data</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAutoSetup}
                    disabled={autoSetting}
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white shadow-sm"
                  >
                    {autoSetting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up database...</>
                    ) : (
                      <><Server className="w-4 h-4 mr-2" /> Create All Tables + Seed Data</>
                    )}
                  </Button>
                  <AnimatePresence>
                    {autoResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-lg p-3 text-xs font-medium ${
                          autoResult.success
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {autoResult.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p>{autoResult.message}</p>
                            {!autoResult.success && (
                              <p className="mt-1 opacity-75">If auto-setup fails, use the manual steps below.</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            <Separator className="my-2" />
            <p className="text-xs text-center text-muted-foreground">Or follow the manual steps below</p>

            {/* Step 1: Copy SQL */}
            <StepCard
              step={1}
              currentStep={currentStep}
              title="Copy the SQL Script"
              description="Click the button below to copy all the SQL needed to create your database tables."
            >
              <div className="space-y-3">
                <Button
                  onClick={handleCopySQL}
                  className={`w-full h-12 text-base font-semibold shadow-sm ${
                    copied
                      ? 'bg-green-600 hover:bg-green-600 text-white'
                      : 'bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white'
                  }`}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> Copied to Clipboard! ✓</>
                  ) : (
                    <><Copy className="w-5 h-5 mr-2" /> Copy Full SQL Script</>
                  )}
                </Button>
                {copied && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-green-600 text-center">
                    SQL copied! Now proceed to Step 2 below ↓
                  </motion.p>
                )}

                {/* Collapsible SQL preview */}
                <button
                  onClick={() => setShowSql(!showSql)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Table2 className="w-3.5 h-3.5" />
                    {showSql ? 'Hide' : 'Preview'} SQL ({FULL_SQL.length.toLocaleString()} chars)
                  </span>
                  {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <AnimatePresence>
                  {showSql && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <pre className="bg-muted rounded-lg p-3 text-[10px] leading-relaxed font-mono text-foreground overflow-auto max-h-64 border border-border">
                        {FULL_SQL}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </StepCard>

            {/* Step 2: Run in Supabase */}
            <StepCard
              step={2}
              currentStep={currentStep}
              title="Open Supabase SQL Editor"
              description="Paste the SQL into the Supabase SQL Editor and click Run."
            >
              <div className="space-y-3">
                <Button
                  onClick={openSupabase}
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10 hover:border-brand-teal/60"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Open Supabase SQL Editor
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                {/* Instructions box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Quick Instructions
                  </p>
                  <ol className="text-xs text-amber-700 ml-1 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-px">1</span>
                      <span>The SQL Editor page will open in a new tab</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-px">2</span>
                      <span>Click in the empty text area and press <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-mono">Ctrl+V</kbd> (or <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-mono">⌘V</kbd> on Mac)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-px">3</span>
                      <span>Click the green <strong>&quot;Run&quot;</strong> button at the bottom right</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-px">4</span>
                      <span>Wait for &quot;Success&quot; message — it takes ~5 seconds</span>
                    </li>
                  </ol>
                </div>
              </div>
            </StepCard>

            {/* Step 3: Verify + Seed */}
            <StepCard
              step={3}
              currentStep={currentStep}
              title="Verify & Seed Database"
              description="Come back here, check the status, then add sample data."
            >
              <div className="space-y-3">
                <Button
                  onClick={checkStatus}
                  disabled={checking}
                  variant="outline"
                  className="w-full h-11 text-sm font-semibold border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Checking...' : 'Check Database Status'}
                </Button>

                {isConnected && allTablesReady && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <p className="text-xs text-green-600 font-medium text-center flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        All tables created! Now add sample data:
                      </p>
                      <Button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white"
                      >
                        {seeding ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding Database...</>
                        ) : (
                          <><Sprout className="w-4 h-4 mr-2" /> Seed Sample Data (10 users, 8 PGs, rooms, beds, bookings...)</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Seed result feedback */}
                <AnimatePresence>
                  {seedResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      className={`rounded-lg p-3 text-xs font-medium text-center ${
                        seedResult.success
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {seedResult.success ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <PartyPopper className="w-3.5 h-3.5" />
                          {seedResult.message}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {seedResult.message}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </StepCard>

            {/* Step 4: Done */}
            <StepCard
              step={4}
              currentStep={currentStep}
              title="You&apos;re All Set! 🎉"
              description="Your StayEg app is ready to use. Start exploring PGs, managing properties, or just browse around."
            >
              <p className="text-xs text-muted-foreground text-center">
                {allTablesReady && status?.stats
                  ? 'Everything is working. Enjoy using StayEg!'
                  : 'Complete the steps above to finish setup.'}
              </p>
            </StepCard>
          </motion.div>
        )}

        {/* ── Info Footer ── */}
        <Separator />
        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Creates 9 tables: users, pgs, rooms, beds, bookings, payments, complaints, vendors, workers
          </p>
          <p className="text-[10px] text-muted-foreground">
            Includes indexes, Row Level Security, and auto-updated timestamps
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Step Card Sub-component ────────────────────────────────────────
function StepCard({
  step,
  currentStep,
  title,
  description,
  children,
}: {
  step: number;
  currentStep: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const isActive = currentStep >= step;
  const isCurrentStep = currentStep === step;
  const isComplete = currentStep > step;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * step }}
    >
      <Card className={`overflow-hidden transition-all duration-300 ${
        isCurrentStep ? 'ring-2 ring-brand-teal/50 shadow-md' : !isActive ? 'opacity-40' : ''
      }`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Step header */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={isCurrentStep ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                isComplete
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-br from-brand-deep to-brand-teal text-white'
              }`}
            >
              {isComplete ? <Check className="w-4 h-4" /> : <span className="text-sm font-bold">{step}</span>}
            </motion.div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Step content */}
          {isActive && <div>{children}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
