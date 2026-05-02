#!/usr/bin/env node
/**
 * StayEg Database Setup Script
 * 
 * This script runs the PRODUCTION-SETUP.sql on the Supabase database.
 * It supports two methods:
 *   1. Direct PostgreSQL connection (preferred, works with IPv4)
 *   2. Supabase REST API with service_role key (fallback)
 * 
 * Usage:
 *   node scripts/setup-database.js
 * 
 * Environment variables required (in .env or set before running):
 *   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: The REAL service_role JWT key (not placeholder)
 *   - SUPABASE_DB_PASSWORD: Database password for direct connection
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lfmeivqeeebxljnjzhxk.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'BizMeals@1998';
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];
const SQL_FILE = path.join(__dirname, '..', 'supabase', 'PRODUCTION-SETUP.sql');

// ─── Method 1: Direct PostgreSQL Connection ─────────────────────────
async function setupViaPostgreSQL() {
  console.log('\n📡 Method 1: Direct PostgreSQL Connection');
  console.log('─'.repeat(50));

  const { Client } = require('pg');
  const dns = require('dns');

  // Try to force IPv4
  try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

  const connectionUrls = [
    // Session mode pooler (recommended for DDL)
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
    // Transaction mode pooler
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    // Direct connection
    `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    // Other regions
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ];

  let client = null;
  let usedUrl = '';

  for (let i = 0; i < connectionUrls.length; i++) {
    const url = connectionUrls[i];
    const label = ['Pooler (session)', 'Pooler (transaction)', 'Direct', 'Pooler (us-east-1)'][i];
    try {
      console.log(`  Trying ${label}...`);
      client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 120000,
        connectionTimeoutMillis: 15000,
      });
      await client.connect();
      usedUrl = url;
      console.log(`  ✅ Connected via ${label}`);
      break;
    } catch (err) {
      console.log(`  ❌ ${label} failed: ${err.message.substring(0, 80)}`);
      client = null;
    }
  }

  if (!client) {
    console.log('\n  ⛔ All PostgreSQL connection methods failed.');
    console.log('  This usually means:');
    console.log('    1. The project might be paused (visit Supabase dashboard to restore)');
    console.log('    2. IPv6-only host and no IPv6 connectivity (common in containers)');
    console.log('    3. Wrong database password');
    console.log('    4. The project ref is incorrect');
    return false;
  }

  try {
    // Read and execute the SQL
    console.log('\n  📄 Reading PRODUCTION-SETUP.sql...');
    const sql = fs.readFileSync(SQL_FILE, 'utf-8');
    console.log(`  📄 SQL file loaded: ${sql.length} bytes`);

    console.log('  ⏳ Executing SQL (this may take 30-60 seconds)...');
    await client.query(sql);
    console.log('  ✅ SQL executed successfully!');

    // Verify tables
    console.log('\n  🔍 Verifying tables...');
    const tables = [
      'users', 'pgs', 'rooms', 'beds', 'bookings', 'payments',
      'complaints', 'vendors', 'workers', 'tenant_notes', 'activity_log',
      'reviews', 'notifications', 'coupons', 'coupon_usages'
    ];

    let allExist = true;
    for (const table of tables) {
      const res = await client.query(
        `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = $1 AND schemaname = 'public')`,
        [table]
      );
      const exists = res.rows[0].exists;
      const countRes = exists ? await client.query(`SELECT COUNT(*)::int FROM "${table}"`) : null;
      const count = countRes ? countRes.rows[0].count : 0;
      console.log(`  ${exists ? '✅' : '❌'} ${table}: ${exists ? `${count} rows` : 'NOT FOUND'}`);
      if (!exists) allExist = false;
    }

    if (allExist) {
      console.log('\n  🎉 All 15 tables created successfully!');
    } else {
      console.log('\n  ⚠️  Some tables are missing. Check errors above.');
    }

    return allExist;
  } catch (err) {
    console.log(`  ❌ SQL execution error: ${err.message}`);
    return false;
  } finally {
    await client.end();
  }
}

// ─── Method 2: Supabase REST API ────────────────────────────────────
async function setupViaRESTAPI() {
  console.log('\n📡 Method 2: Supabase REST API with service_role key');
  console.log('─'.repeat(50));

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('sb_secret_')) {
    console.log('  ⛔ Invalid or placeholder service_role key detected.');
    console.log('  Please set the real SUPABASE_SERVICE_ROLE_KEY in your .env file.');
    console.log('  You can find it at: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/api-keys');
    return false;
  }

  // Verify the key works
  console.log('  🔑 Verifying service_role key...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.log(`  ❌ API key verification failed: ${JSON.stringify(data)}`);
      return false;
    }
    console.log('  ✅ Service role key is valid!');
  } catch (err) {
    console.log(`  ❌ API key verification error: ${err.message}`);
    return false;
  }

  // Note: The REST API (PostgREST) does NOT support DDL operations like
  // CREATE TABLE, ALTER TABLE, CREATE POLICY, etc.
  // You MUST use one of these methods instead:
  //   1. Supabase Dashboard SQL Editor
  //   2. Direct PostgreSQL connection
  //   3. Supabase Management API (requires personal access token)
  
  console.log('\n  ⚠️  The Supabase REST API (PostgREST) does NOT support DDL operations.');
  console.log('  You cannot create tables through the REST API.');
  console.log('  Please use one of these alternatives:');
  console.log('    1. Supabase Dashboard → SQL Editor (paste PRODUCTION-SETUP.sql)');
  console.log('    2. Direct PostgreSQL connection (see Method 1)');
  console.log('    3. Supabase Management API (needs personal access token)');
  
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       StayEg v2.0 — Database Setup Script           ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nProject: ${PROJECT_REF}`);
  console.log(`SQL file: ${SQL_FILE}`);

  if (!fs.existsSync(SQL_FILE)) {
    console.error(`\n❌ SQL file not found at: ${SQL_FILE}`);
    process.exit(1);
  }

  // Try Method 1 first
  const pgResult = await setupViaPostgreSQL();

  if (!pgResult) {
    // Try Method 2 as fallback
    const restResult = await setupViaRESTAPI();
    
    if (!restResult) {
      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║            ⛔ SETUP FAILED                          ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('\nManual setup required:');
      console.log('  1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql');
      console.log('  2. Click "New Query"');
      console.log('  3. Paste the entire contents of supabase/PRODUCTION-SETUP.sql');
      console.log('  4. Click "Run"');
      console.log('  5. Get the service_role key from:');
      console.log('     https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/api-keys');
      console.log('  6. Update .env with the real SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
  }

  console.log('\n✅ Database setup completed!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
