/**
 * StayEg Database Verification Script
 * Run this AFTER executing PRODUCTION-SETUP.sql in the Supabase SQL Editor
 * 
 * Usage: node verify-db.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lfmeivqeeebxljnjzhxk.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbWVpdnFlZWVieGxqbmp6aHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTk5ODgsImV4cCI6MjA5MzI5NTk4OH0.44Qky-6NEqutFD4E9ks8wdIvCg8EhmKhE3yVOQfsB9U';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REQUIRED_TABLES = [
  'users', 'pgs', 'rooms', 'beds', 'bookings', 'payments',
  'complaints', 'vendors', 'workers', 'tenant_notes', 'activity_log',
  'reviews', 'notifications', 'coupons', 'coupon_usages'
];

async function main() {
  console.log('🔍 StayEg Database Verification\n');
  console.log('='.repeat(50));
  
  // Test with anon key (public reads only)
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test with service role key (full access)
  const supabaseAdmin = SUPABASE_SERVICE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;
  
  if (!supabaseAdmin) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - skipping admin tests');
    console.log('   Set it in .env to run full verification\n');
  }
  
  const results = { passed: 0, failed: 0, warnings: 0 };
  
  // Test 1: Public tables (readable with anon key)
  console.log('\n📋 Test 1: Public Tables (anon key read access)');
  console.log('-'.repeat(50));
  
  const publicTables = ['users', 'pgs', 'rooms', 'beds', 'vendors', 'reviews'];
  for (const table of publicTables) {
    const { data, error } = await supabaseAnon.from(table).select('id').limit(1);
    if (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
      results.failed++;
    } else {
      console.log(`  ✅ ${table}: readable (${data?.length || 0} rows accessible)`);
      results.passed++;
    }
  }
  
  // Test 2: Protected tables (should fail with anon key, need service role)
  console.log('\n🔒 Test 2: Protected Tables (anon key should be denied)');
  console.log('-'.repeat(50));
  
  const protectedTables = ['bookings', 'payments', 'complaints', 'workers', 'notifications'];
  for (const table of protectedTables) {
    const { data, error } = await supabaseAnon.from(table).select('id').limit(1);
    if (error) {
      console.log(`  ✅ ${table}: properly protected (${error.code})`);
      results.passed++;
    } else {
      console.log(`  ⚠️  ${table}: accessible with anon key (should be protected!)`);
      results.warnings++;
    }
  }
  
  // Test 3: Service role access (if key available)
  if (supabaseAdmin) {
    console.log('\n🔑 Test 3: Service Role Full Access');
    console.log('-'.repeat(50));
    
    for (const table of REQUIRED_TABLES) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
        results.failed++;
      } else {
        console.log(`  ✅ ${table}: ${count} rows`);
        results.passed++;
      }
    }
  }
  
  // Test 4: Verify seed data
  console.log('\n🌱 Test 4: Seed Data Verification');
  console.log('-'.repeat(50));
  
  const client = supabaseAdmin || supabaseAnon;
  const { count: pgCount } = await client.from('pgs').select('*', { count: 'exact', head: true });
  const { count: userCount } = await client.from('users').select('*', { count: 'exact', head: true });
  
  console.log(`  PGs: ${pgCount || 0} (expected: 6)`);
  console.log(`  Users: ${userCount || 0} (expected: 10)`);
  
  if (pgCount >= 6 && userCount >= 10) {
    console.log('  ✅ Seed data looks good!');
    results.passed++;
  } else {
    console.log('  ❌ Seed data incomplete. Run seed endpoint or re-run PRODUCTION-SETUP.sql');
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);
  
  if (results.failed === 0) {
    console.log('\n✅ Database is ready for production!');
  } else {
    console.log('\n❌ Database setup incomplete. Please review errors above.');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
