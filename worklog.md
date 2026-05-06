---
Task ID: 1
Agent: main
Task: Build fully idempotent Phase 5 Hardening SQL for StayEg database

Work Log:
- Read existing PRODUCTION SETUP SQL (15 tables already created)
- Read existing Phase 2 Security SQL (RLS policies, create_booking_atomic, bank account columns, payment verification columns - already run)
- Read existing Phase 5 Hardening SQL (had multiple idempotency issues)
- Identified all issues causing repeated failures:
  - No STEP 0 cleanup of views before ALTER COLUMN TYPE
  - No DROP POLICY IF EXISTS before CREATE POLICY
  - No DROP TRIGGER IF EXISTS before CREATE TRIGGER
  - Constraints not using EXCEPTION WHEN duplicate_object
  - Functions not dropped before recreation (signature conflicts)
  - Missing tables from previous partial runs (reports, contact_submissions, review_helpful_votes)
  - Blanket function drops touching pg_trgm's set_limit(real)
- Rebuilt entire Phase 5 SQL with 10 ordered steps:
  STEP 0:  Drop conflicting views/matviews/functions/triggers/policies/constraints
  STEP 1:  Create all tables with IF NOT EXISTS (7 tables including reports, contact_submissions, review_helpful_votes)
  STEP 2:  RLS enable + policies with DROP POLICY IF EXISTS first
  STEP 3:  Constraints with DO $$ EXCEPTION WHEN duplicate_object
  STEP 4:  All triggers with DROP TRIGGER IF EXISTS first
  STEP 5:  Performance indexes with IF NOT EXISTS
  STEP 6:  Soft delete columns with ADD COLUMN IF NOT EXISTS
  STEP 7:  Monetary type migration (views already dropped in STEP 0)
  STEP 8:  Dashboard views (after soft delete + monetary migration)
  STEP 9:  Atomic RPC functions with targeted DROP FUNCTION IF EXISTS
  STEP 10: Validation helper functions with targeted DROP FUNCTION IF EXISTS

Stage Summary:
- Produced /home/z/my-project/download/STAYEG-PHASE5-HARDENING.sql
- Fully idempotent - can be run multiple times without errors
- All previous error patterns addressed:
  - "cannot alter type of column used by view" → views dropped first in STEP 0
  - "cannot change name of input parameter" → functions dropped first in STEP 0
  - "policy already exists" → policies dropped first in STEP 0
  - "relation X does not exist" → all tables created with IF NOT EXISTS in STEP 1
  - "cannot drop function set_limit" → only targeted drops, not blanket
  - "constraint already exists" → dropped first + exception handling
