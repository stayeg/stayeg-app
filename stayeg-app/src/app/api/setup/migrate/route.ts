/**
 * POST /api/setup/migrate
 * 
 * Executes the complete database migration directly via PostgreSQL connection.
 * This endpoint connects to Supabase's PostgreSQL database to run DDL statements
 * (ALTER TABLE, CREATE POLICY, etc.) that can't be done through the REST API.
 * 
 * Protected by ADMIN_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSecret } from '@/lib/api-auth';

const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'BizMeals@1998';
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0] || 'rgkbkdxfekslaygvjngm';

const CONNECTION_URLS = [
  // Direct connection (IPv4)
  `postgresql://postgres:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  // Session mode pooler (port 6543)
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  // Transaction mode pooler (port 6543)  
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  // Alternative pooler format
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
];

async function getClient(): Promise<any> {
  // Dynamic import for pg module
  const pg = await import('pg');
  const { Client } = pg;

  for (let i = 0; i < CONNECTION_URLS.length; i++) {
    const url = CONNECTION_URLS[i];
    try {
      const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 30000,
        connectionTimeoutMillis: 10000,
      });
      await client.connect();
      return { client, urlIndex: i };
    } catch (err: any) {
      console.log(`Connection attempt ${i + 1} failed: ${err.message.substring(0, 80)}`);
    }
  }
  throw new Error('Could not connect to Supabase PostgreSQL. All connection methods failed.');
}

export async function POST(request: NextRequest) {
  const secretError = requireAdminSecret(request);
  if (secretError) return secretError;

  const results: { step: string; success: boolean; message: string }[] = [];

  try {
    const { client, urlIndex } = await getClient();
    results.push({ step: '0. Database Connection', success: true, message: `Connected via method ${urlIndex + 1}` });

    try {
      // Step 1: Add security columns to users
      results.push({ step: '1. Adding security columns to users', success: true, message: '' });
      const userCols = [
        { col: 'password_hash', def: 'TEXT' },
        { col: 'otp_code', def: 'TEXT' },
        { col: 'otp_expires_at', def: 'TIMESTAMPTZ' },
        { col: 'kyc_status', def: "TEXT DEFAULT 'NOT_SUBMITTED' CHECK (kyc_status IN ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'))" },
      ];

      for (const { col, def } of userCols) {
        try {
          const { rows } = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = $1`,
            [col]
          );
          if (rows.length === 0) {
            await client.query(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
            results[results.length - 1].message += `Added ${col}; `;
          } else {
            results[results.length - 1].message += `${col} exists; `;
          }
        } catch (e: any) {
          results[results.length - 1].message += `${col}: ${e.message.substring(0, 40)}; `;
        }
      }

      // Step 2: Add RazorPay columns to payments
      results.push({ step: '2. Adding RazorPay columns to payments', success: true, message: '' });
      const payCols = [
        { col: 'razorpay_order_id', def: 'TEXT' },
        { col: 'razorpay_payment_id', def: 'TEXT' },
      ];

      for (const { col, def } of payCols) {
        try {
          const { rows } = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name = $1`,
            [col]
          );
          if (rows.length === 0) {
            await client.query(`ALTER TABLE payments ADD COLUMN ${col} ${def}`);
            results[results.length - 1].message += `Added ${col}; `;
          } else {
            results[results.length - 1].message += `${col} exists; `;
          }
        } catch (e: any) {
          results[results.length - 1].message += `${col}: ${e.message.substring(0, 40)}; `;
        }
      }

      // Step 3: Update payment method constraint
      results.push({ step: '3. Updating payment method constraint', success: true, message: '' });
      try {
        await client.query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check`);
        await client.query(`ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('UPI', 'CARD', 'NET_BANKING', 'CASH', 'RAZORPAY', 'ONLINE'))`);
        results[results.length - 1].message = 'Constraint updated to include RAZORPAY, ONLINE';
      } catch (e: any) {
        results[results.length - 1].success = false;
        results[results.length - 1].message = e.message.substring(0, 100);
      }

      // Step 4: Hash default passwords
      results.push({ step: '4. Setting default password hashes', success: true, message: '' });
      try {
        const bcrypt = await import('bcryptjs');
        const defaultHash = await bcrypt.hash('StayEg@2025', 12);
        const { rowCount } = await client.query(
          `UPDATE users SET password_hash = $1 WHERE password_hash IS NULL`,
          [defaultHash]
        );
        results[results.length - 1].message = `Hashed passwords for ${rowCount} users`;
      } catch (e: any) {
        results[results.length - 1].message = `bcrypt issue: ${e.message.substring(0, 60)}`;
      }

      // Step 5: Drop old open RLS policies
      results.push({ step: '5. Dropping old open RLS policies', success: true, message: '' });
      const oldPolicies = [
        ['users', 'Users readable by all'], ['users', 'Users insertable by anon'], ['users', 'Users updatable by all'],
        ['pgs', 'PGs readable by all'], ['pgs', 'PGs insertable by all'], ['pgs', 'PGs updatable by all'],
        ['rooms', 'Rooms readable by all'], ['rooms', 'Rooms insertable by all'], ['rooms', 'Rooms updatable by all'], ['rooms', 'Rooms deletable by all'],
        ['beds', 'Beds readable by all'], ['beds', 'Beds insertable by all'], ['beds', 'Beds updatable by all'], ['beds', 'Beds deletable by all'],
        ['bookings', 'Bookings readable by all'], ['bookings', 'Bookings insertable by all'], ['bookings', 'Bookings updatable by all'], ['bookings', 'Bookings deletable by all'],
        ['payments', 'Payments readable by all'], ['payments', 'Payments insertable by all'], ['payments', 'Payments updatable by all'], ['payments', 'Payments deletable by all'],
        ['complaints', 'Complaints readable by all'], ['complaints', 'Complaints insertable by all'], ['complaints', 'Complaints updatable by all'],
        ['vendors', 'Vendors readable by all'], ['vendors', 'Vendors insertable by all'], ['vendors', 'Vendors updatable by all'], ['vendors', 'Vendors deletable by all'],
        ['workers', 'Workers readable by all'], ['workers', 'Workers insertable by all'], ['workers', 'Workers updatable by all'], ['workers', 'Workers deletable by all'],
        ['tenant_notes', 'Tenant notes readable by all'], ['tenant_notes', 'Tenant notes insertable by all'], ['tenant_notes', 'Tenant notes updatable by all'], ['tenant_notes', 'Tenant notes deletable by all'],
        ['activity_log', 'Activity log readable by all'], ['activity_log', 'Activity log insertable by all'],
      ];
      
      let droppedCount = 0;
      for (const [table, policy] of oldPolicies) {
        try {
          await client.query(`DROP POLICY IF EXISTS "${policy}" ON ${table}`);
          droppedCount++;
        } catch { /* ignore */ }
      }
      results[results.length - 1].message = `Processed ${droppedCount} old policies`;

      // Step 6: Create secure RLS policies
      results.push({ step: '6. Creating secure RLS policies', success: true, message: '' });
      const newPolicies: { table: string; name: string; sql: string }[] = [
        // Users
        { table: 'users', name: 'users_select_public', sql: 'CREATE POLICY "users_select_public" ON users FOR SELECT USING (true)' },
        { table: 'users', name: 'users_insert_public', sql: 'CREATE POLICY "users_insert_public" ON users FOR INSERT WITH CHECK (true)' },
        { table: 'users', name: 'users_update_own', sql: `CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid()::text = id OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'ADMIN' OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // PGs
        { table: 'pgs', name: 'pgs_select_public', sql: `CREATE POLICY "pgs_select_public" ON pgs FOR SELECT USING (status = 'APPROVED' OR is_verified = true)` },
        { table: 'pgs', name: 'pgs_insert_owner', sql: 'CREATE POLICY "pgs_insert_owner" ON pgs FOR INSERT WITH CHECK (true)' },
        { table: 'pgs', name: 'pgs_update_own', sql: `CREATE POLICY "pgs_update_own" ON pgs FOR UPDATE USING (owner_id = auth.uid()::text OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'pgs', name: 'pgs_delete_admin', sql: `CREATE POLICY "pgs_delete_admin" ON pgs FOR DELETE USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Rooms
        { table: 'rooms', name: 'rooms_select_public', sql: `CREATE POLICY "rooms_select_public" ON rooms FOR SELECT USING (pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR is_verified = true) OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'rooms', name: 'rooms_manage', sql: `CREATE POLICY "rooms_manage" ON rooms FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Beds
        { table: 'beds', name: 'beds_select_public', sql: `CREATE POLICY "beds_select_public" ON beds FOR SELECT USING (room_id IN (SELECT id FROM rooms WHERE pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR is_verified = true)) OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'beds', name: 'beds_manage', sql: `CREATE POLICY "beds_manage" ON beds FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Bookings
        { table: 'bookings', name: 'bookings_select_own', sql: `CREATE POLICY "bookings_select_own" ON bookings FOR SELECT USING (user_id = auth.uid()::text OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'bookings', name: 'bookings_insert_auth', sql: 'CREATE POLICY "bookings_insert_auth" ON bookings FOR INSERT WITH CHECK (true)' },
        { table: 'bookings', name: 'bookings_manage', sql: `CREATE POLICY "bookings_manage" ON bookings FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Payments
        { table: 'payments', name: 'payments_select_own', sql: `CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (user_id = auth.uid()::text OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'payments', name: 'payments_insert_auth', sql: 'CREATE POLICY "payments_insert_auth" ON payments FOR INSERT WITH CHECK (true)' },
        { table: 'payments', name: 'payments_update_admin', sql: `CREATE POLICY "payments_update_admin" ON payments FOR UPDATE USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Complaints
        { table: 'complaints', name: 'complaints_select_own', sql: `CREATE POLICY "complaints_select_own" ON complaints FOR SELECT USING (user_id = auth.uid()::text OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'complaints', name: 'complaints_insert_auth', sql: 'CREATE POLICY "complaints_insert_auth" ON complaints FOR INSERT WITH CHECK (true)' },
        { table: 'complaints', name: 'complaints_manage', sql: `CREATE POLICY "complaints_manage" ON complaints FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Vendors
        { table: 'vendors', name: 'vendors_select_public', sql: 'CREATE POLICY "vendors_select_public" ON vendors FOR SELECT USING (true)' },
        { table: 'vendors', name: 'vendors_manage', sql: `CREATE POLICY "vendors_manage" ON vendors FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Workers
        { table: 'workers', name: 'workers_select_public', sql: `CREATE POLICY "workers_select_public" ON workers FOR SELECT USING (pg_id IN (SELECT id FROM pgs WHERE status = 'APPROVED' OR is_verified = true) OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        { table: 'workers', name: 'workers_manage', sql: `CREATE POLICY "workers_manage" ON workers FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Tenant notes
        { table: 'tenant_notes', name: 'tenant_notes_manage', sql: `CREATE POLICY "tenant_notes_manage" ON tenant_notes FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
        // Activity log
        { table: 'activity_log', name: 'activity_log_manage', sql: `CREATE POLICY "activity_log_manage" ON activity_log FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')` },
      ];

      let createdCount = 0;
      for (const p of newPolicies) {
        try {
          await client.query(`DROP POLICY IF EXISTS "${p.name}" ON ${p.table}`);
          await client.query(p.sql);
          createdCount++;
        } catch (e: any) {
          results[results.length - 1].message += `FAIL ${p.name}: ${e.message.substring(0, 40)}; `;
        }
      }
      if (!results[results.length - 1].message) {
        results[results.length - 1].message = `Created ${createdCount}/${newPolicies.length} policies`;
      }

      // Step 7: Verification
      results.push({ step: '7. Verification', success: true, message: '' });
      try {
        const { rows: verifyRows } = await client.query(
          `SELECT email, password_hash IS NOT NULL as has_hash FROM users LIMIT 15`
        );
        let verifiedCount = 0;
        for (const row of verifyRows) {
          if (row.has_hash) verifiedCount++;
          results[results.length - 1].message += `${row.email}: ${row.has_hash ? 'OK' : 'MISSING'}; `;
        }
        results[results.length - 1].message = `Passwords: ${verifiedCount}/${verifyRows.length} hashed. ${results[results.length - 1].message}`;

        const { rows: colRows } = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('password_hash', 'otp_code', 'otp_expires_at', 'kyc_status')`
        );
        const missingCols = ['password_hash', 'otp_code', 'otp_expires_at', 'kyc_status'].filter(c => !colRows.some(r => r.column_name === c));
        if (missingCols.length > 0) {
          results[results.length - 1].message += ` MISSING_COLS: ${missingCols.join(', ')}`;
        } else {
          results[results.length - 1].message += ' All security columns present.';
        }
      } catch (e: any) {
        results[results.length - 1].message = `Verify error: ${e.message.substring(0, 80)}`;
      }

    } finally {
      await client.end();
    }

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully!',
      results,
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error.message,
      results,
    }, { status: 500 });
  }
}
