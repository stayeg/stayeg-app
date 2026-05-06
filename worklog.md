---
Task ID: 1
Agent: main
Task: Complete Phase 2 remaining items (C-3 RLS, H-11 Booking Race Condition, Bank Account Fields)

Work Log:
- Checked current state of codebase: confirmed all Phase 1 + Phase 2 code fixes were already applied
- Created STAYEG-PHASE2-MIGRATION.sql with proper RLS policies, atomic booking RPC, bank account columns
- Could not connect to Supabase DB directly (IPv6/unreachable from container)
- Updated PG types (lib/types.ts) to include bank account fields
- Updated PG API route (api/pgs/route.ts) PUT handler to support bank account fields
- Created dedicated bank-details API (api/pgs/bank-details/route.ts) with GET + PUT, account number masking
- Updated PG detail API (api/pgs/[id]/route.ts) to mask bank account numbers and include bank fields
- Updated owner PG management UI (owner/pg-management.tsx) with bank account form fields
- Booking route already has create_booking_atomic RPC call with fallback — just needs the SQL function in DB
- Build succeeded, dev server restarted

Stage Summary:
- Migration SQL file ready at /home/z/my-project/download/STAYEG-PHASE2-MIGRATION.sql
- User needs to run this SQL in Supabase Dashboard > SQL Editor
- All code changes are applied and compiled successfully
- Phase 1 + Phase 2 are now 100% complete (code-level)
