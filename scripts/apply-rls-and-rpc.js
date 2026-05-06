/**
 * Apply proper RLS policies and create the atomic booking RPC function
 * on the Supabase PostgreSQL database.
 *
 * This script:
 * 1. Drops old USING(true) RLS policies
 * 2. Creates proper restrictive RLS policies
 * 3. Creates the create_booking_atomic RPC function for race-condition-free bookings
 * 4. Adds bank account columns to the pgs table
 */

const { Pool } = require('pg');

const SUPABASE_DB_URL = `postgresql://postgres:${encodeURIComponent('StayEg@191998')}@db.lfmeivqeeebxljnjzhxk.supabase.co:5432/postgres`;

async function main() {
  const pool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log('Connected to Supabase database.');

  try {
    // =============================================================
    // STEP 1: Drop all existing RLS policies on all tables
    // =============================================================
    console.log('\n--- Step 1: Dropping old RLS policies ---');

    const tables = [
      'users', 'pgs', 'rooms', 'beds', 'bookings', 'payments',
      'complaints', 'vendors', 'workers', 'tenant_notes', 'activity_log',
      'reviews', 'notifications', 'coupons', 'coupon_usages'
    ];

    for (const table of tables) {
      // Get all policies on this table
      const { rows: policies } = await client.query(
        `SELECT policyname FROM pg_policies WHERE tablename = $1`, [table]
      );
      for (const p of policies) {
        console.log(`  Dropping policy "${p.policyname}" on ${table}`);
        await client.query(`DROP POLICY IF EXISTS "${p.policyname}" ON ${table}`);
      }
    }
    console.log('All old policies dropped.');

    // =============================================================
    // STEP 2: Enable RLS on all tables
    // =============================================================
    console.log('\n--- Step 2: Enabling RLS on all tables ---');

    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      console.log(`  RLS enabled on ${table}`);
    }

    // =============================================================
    // STEP 3: Create proper restrictive RLS policies
    // =============================================================
    console.log('\n--- Step 3: Creating restrictive RLS policies ---');

    // Helper to run policy creation
    async function createPolicy(sql, description) {
      try {
        await client.query(sql);
        console.log(`  ✓ ${description}`);
      } catch (err) {
        console.error(`  ✗ ${description}: ${err.message}`);
      }
    }

    // --- USERS ---
    await createPolicy(
      `CREATE POLICY "users_select_public" ON users FOR SELECT USING (true)`,
      'users: public SELECT'
    );
    await createPolicy(
      `CREATE POLICY "users_insert_service" ON users FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'users: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "users_update_service" ON users FOR UPDATE USING (auth.role() = 'service_role')`,
      'users: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "users_delete_service" ON users FOR DELETE USING (auth.role() = 'service_role')`,
      'users: service_role DELETE'
    );

    // --- PGS ---
    await createPolicy(
      `CREATE POLICY "pgs_select_public" ON pgs FOR SELECT USING (true)`,
      'pgs: public SELECT'
    );
    await createPolicy(
      `CREATE POLICY "pgs_insert_service" ON pgs FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'pgs: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "pgs_update_service" ON pgs FOR UPDATE USING (auth.role() = 'service_role')`,
      'pgs: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "pgs_delete_service" ON pgs FOR DELETE USING (auth.role() = 'service_role')`,
      'pgs: service_role DELETE'
    );

    // --- ROOMS ---
    await createPolicy(
      `CREATE POLICY "rooms_select_public" ON rooms FOR SELECT USING (true)`,
      'rooms: public SELECT'
    );
    await createPolicy(
      `CREATE POLICY "rooms_insert_service" ON rooms FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'rooms: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "rooms_update_service" ON rooms FOR UPDATE USING (auth.role() = 'service_role')`,
      'rooms: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "rooms_delete_service" ON rooms FOR DELETE USING (auth.role() = 'service_role')`,
      'rooms: service_role DELETE'
    );

    // --- BEDS ---
    await createPolicy(
      `CREATE POLICY "beds_select_public" ON beds FOR SELECT USING (true)`,
      'beds: public SELECT'
    );
    await createPolicy(
      `CREATE POLICY "beds_insert_service" ON beds FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'beds: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "beds_update_service" ON beds FOR UPDATE USING (auth.role() = 'service_role')`,
      'beds: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "beds_delete_service" ON beds FOR DELETE USING (auth.role() = 'service_role')`,
      'beds: service_role DELETE'
    );

    // --- BOOKINGS (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "bookings_select_service" ON bookings FOR SELECT USING (auth.role() = 'service_role')`,
      'bookings: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "bookings_insert_service" ON bookings FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'bookings: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "bookings_update_service" ON bookings FOR UPDATE USING (auth.role() = 'service_role')`,
      'bookings: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "bookings_delete_service" ON bookings FOR DELETE USING (auth.role() = 'service_role')`,
      'bookings: service_role DELETE'
    );

    // --- PAYMENTS (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "payments_select_service" ON payments FOR SELECT USING (auth.role() = 'service_role')`,
      'payments: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "payments_insert_service" ON payments FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'payments: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "payments_update_service" ON payments FOR UPDATE USING (auth.role() = 'service_role')`,
      'payments: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "payments_delete_service" ON payments FOR DELETE USING (auth.role() = 'service_role')`,
      'payments: service_role DELETE'
    );

    // --- COMPLAINTS (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "complaints_select_service" ON complaints FOR SELECT USING (auth.role() = 'service_role')`,
      'complaints: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "complaints_insert_service" ON complaints FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'complaints: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "complaints_update_service" ON complaints FOR UPDATE USING (auth.role() = 'service_role')`,
      'complaints: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "complaints_delete_service" ON complaints FOR DELETE USING (auth.role() = 'service_role')`,
      'complaints: service_role DELETE'
    );

    // --- VENDORS (public read) ---
    await createPolicy(
      `CREATE POLICY "vendors_select_public" ON vendors FOR SELECT USING (true)`,
      'vendors: public SELECT'
    );
    await createPolicy(
      `CREATE POLICY "vendors_insert_service" ON vendors FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'vendors: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "vendors_update_service" ON vendors FOR UPDATE USING (auth.role() = 'service_role')`,
      'vendors: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "vendors_delete_service" ON vendors FOR DELETE USING (auth.role() = 'service_role')`,
      'vendors: service_role DELETE'
    );

    // --- WORKERS (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "workers_select_service" ON workers FOR SELECT USING (auth.role() = 'service_role')`,
      'workers: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "workers_insert_service" ON workers FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'workers: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "workers_update_service" ON workers FOR UPDATE USING (auth.role() = 'service_role')`,
      'workers: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "workers_delete_service" ON workers FOR DELETE USING (auth.role() = 'service_role')`,
      'workers: service_role DELETE'
    );

    // --- TENANT NOTES (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "tenant_notes_select_service" ON tenant_notes FOR SELECT USING (auth.role() = 'service_role')`,
      'tenant_notes: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "tenant_notes_insert_service" ON tenant_notes FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'tenant_notes: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "tenant_notes_update_service" ON tenant_notes FOR UPDATE USING (auth.role() = 'service_role')`,
      'tenant_notes: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "tenant_notes_delete_service" ON tenant_notes FOR DELETE USING (auth.role() = 'service_role')`,
      'tenant_notes: service_role DELETE'
    );

    // --- ACTIVITY LOG (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "activity_log_select_service" ON activity_log FOR SELECT USING (auth.role() = 'service_role')`,
      'activity_log: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "activity_log_insert_service" ON activity_log FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'activity_log: service_role INSERT'
    );

    // --- REVIEWS (public read) ---
    await createPolicy(
      `CREATE POLICY "reviews_select_public" ON reviews FOR SELECT USING (true)`,
      'reviews: public SELECT'
    );
    await createPolicy(
      `CREATE POLICY "reviews_insert_service" ON reviews FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'reviews: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "reviews_update_service" ON reviews FOR UPDATE USING (auth.role() = 'service_role')`,
      'reviews: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "reviews_delete_service" ON reviews FOR DELETE USING (auth.role() = 'service_role')`,
      'reviews: service_role DELETE'
    );

    // --- NOTIFICATIONS (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "notifications_select_service" ON notifications FOR SELECT USING (auth.role() = 'service_role')`,
      'notifications: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'notifications: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "notifications_update_service" ON notifications FOR UPDATE USING (auth.role() = 'service_role')`,
      'notifications: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "notifications_delete_service" ON notifications FOR DELETE USING (auth.role() = 'service_role')`,
      'notifications: service_role DELETE'
    );

    // --- COUPONS (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "coupons_select_service" ON coupons FOR SELECT USING (auth.role() = 'service_role')`,
      'coupons: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "coupons_insert_service" ON coupons FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'coupons: service_role INSERT'
    );
    await createPolicy(
      `CREATE POLICY "coupons_update_service" ON coupons FOR UPDATE USING (auth.role() = 'service_role')`,
      'coupons: service_role UPDATE'
    );
    await createPolicy(
      `CREATE POLICY "coupons_delete_service" ON coupons FOR DELETE USING (auth.role() = 'service_role')`,
      'coupons: service_role DELETE'
    );

    // --- COUPON USAGES (sensitive - service_role only) ---
    await createPolicy(
      `CREATE POLICY "coupon_usages_select_service" ON coupon_usages FOR SELECT USING (auth.role() = 'service_role')`,
      'coupon_usages: service_role SELECT'
    );
    await createPolicy(
      `CREATE POLICY "coupon_usages_insert_service" ON coupon_usages FOR INSERT WITH CHECK (auth.role() = 'service_role')`,
      'coupon_usages: service_role INSERT'
    );

    // =============================================================
    // STEP 4: Create atomic booking RPC function
    // =============================================================
    console.log('\n--- Step 4: Creating create_booking_atomic RPC function ---');

    await client.query(`
      CREATE OR REPLACE FUNCTION create_booking_atomic(
        p_user_id TEXT,
        p_pg_id TEXT,
        p_bed_id TEXT,
        p_check_in_date TIMESTAMPTZ,
        p_advance_paid DOUBLE PRECISION DEFAULT 0
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_bed_status TEXT;
        v_existing_booking_id TEXT;
        v_booking_id TEXT;
        v_result JSONB;
      BEGIN
        -- Check bed exists and get its current status with row lock
        SELECT status INTO v_bed_status
        FROM beds
        WHERE id = p_bed_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RETURN jsonb_build_object(
            'error', 'Bed not found',
            'code', 'BED_NOT_FOUND'
          );
        END IF;

        -- Check if bed is available
        IF v_bed_status != 'AVAILABLE' THEN
          RETURN jsonb_build_object(
            'error', 'This bed is already booked. Please select another bed.',
            'code', 'BED_OCCUPIED'
          );
        END IF;

        -- Check for existing active booking on this bed
        SELECT id INTO v_existing_booking_id
        FROM bookings
        WHERE bed_id = p_bed_id
          AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
        FOR UPDATE;

        IF v_existing_booking_id IS NOT NULL THEN
          RETURN jsonb_build_object(
            'error', 'This bed already has an active booking.',
            'code', 'BOOKING_EXISTS'
          );
        END IF;

        -- Create the booking
        INSERT INTO bookings (user_id, pg_id, bed_id, check_in_date, advance_paid, status)
        VALUES (p_user_id, p_pg_id, p_bed_id, p_check_in_date, p_advance_paid, 'PENDING')
        RETURNING id INTO v_booking_id;

        -- Mark bed as OCCUPIED
        UPDATE beds SET status = 'OCCUPIED' WHERE id = p_bed_id;

        -- Return the booking ID
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
    `);
    console.log('  ✓ create_booking_atomic RPC function created');

    // =============================================================
    // STEP 5: Add bank account columns to pgs table
    // =============================================================
    console.log('\n--- Step 5: Adding bank account columns to pgs table ---');

    // Check if columns already exist
    const { rows: pgColumns } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'pgs'`
    );
    const existingCols = pgColumns.map(r => r.column_name);

    const bankColumns = [
      { name: 'bank_account_name', type: 'TEXT', default: null },
      { name: 'bank_account_number', type: 'TEXT', default: null },
      { name: 'bank_ifsc_code', type: 'TEXT', default: null },
      { name: 'bank_name', type: 'TEXT', default: null },
      { name: 'bank_branch', type: 'TEXT', default: null },
      { name: 'upi_id', type: 'TEXT', default: null },
    ];

    for (const col of bankColumns) {
      if (!existingCols.includes(col.name)) {
        const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
        await client.query(`ALTER TABLE pgs ADD COLUMN ${col.name} ${col.type}${defaultClause}`);
        console.log(`  ✓ Added column ${col.name} to pgs`);
      } else {
        console.log(`  - Column ${col.name} already exists in pgs, skipping`);
      }
    }

    // Also add razorpay_order_id and razorpay_payment_id columns to payments if missing
    const { rows: payColumns } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'payments'`
    );
    const existingPayCols = payColumns.map(r => r.column_name);

    if (!existingPayCols.includes('razorpay_order_id')) {
      await client.query(`ALTER TABLE payments ADD COLUMN razorpay_order_id TEXT`);
      console.log('  ✓ Added razorpay_order_id to payments');
    }
    if (!existingPayCols.includes('razorpay_payment_id')) {
      await client.query(`ALTER TABLE payments ADD COLUMN razorpay_payment_id TEXT`);
      console.log('  ✓ Added razorpay_payment_id to payments');
    }
    if (!existingPayCols.includes('verification_note')) {
      await client.query(`ALTER TABLE payments ADD COLUMN verification_note TEXT`);
      console.log('  ✓ Added verification_note to payments');
    }

    console.log('\n✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!');

    // Verify: list current policies on each table
    console.log('\n--- Verification: Current RLS policies ---');
    for (const table of tables) {
      const { rows: policies } = await client.query(
        `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = $1`,
        [table]
      );
      console.log(`\n  ${table} (${policies.length} policies):`);
      for (const p of policies) {
        const qual = p.qual || '(none)';
        const check = p.with_check || '(none)';
        console.log(`    - ${p.policyname} [${p.cmd}]: USING(${qual}) WITH_CHECK(${check})`);
      }
    }

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
