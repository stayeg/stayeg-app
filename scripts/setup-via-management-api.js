#!/usr/bin/env node
/**
 * StayEg Database Setup via Supabase Management API
 * 
 * This script uses the Supabase Management API to execute SQL.
 * It requires a Supabase personal access token (NOT the service_role key).
 * 
 * To get a personal access token:
 *   1. Go to https://supabase.com/dashboard/account/tokens
 *   2. Click "Generate New Token"
 *   3. Copy the token and set it as SUPABASE_ACCESS_TOKEN
 * 
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=your-token node scripts/setup-via-management-api.js
 * 
 * Environment variables:
 *   - SUPABASE_ACCESS_TOKEN: Personal access token from Supabase dashboard
 *   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 */

const fs = require('fs');
const path = require('path');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lfmeivqeeebxljnjzhxk.supabase.co';
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];
const SQL_FILE = path.join(__dirname, '..', 'supabase', 'PRODUCTION-SETUP.sql');

async function run() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   StayEg — Database Setup via Management API        ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  if (!ACCESS_TOKEN) {
    console.error('\n❌ SUPABASE_ACCESS_TOKEN not set.');
    console.log('Get one at: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  if (!fs.existsSync(SQL_FILE)) {
    console.error(`\n❌ SQL file not found: ${SQL_FILE}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_FILE, 'utf-8');
  console.log(`\nProject: ${PROJECT_REF}`);
  console.log(`SQL file: ${SQL_FILE} (${sql.length} bytes)`);

  // Execute SQL via Management API
  console.log('\n⏳ Executing SQL via Management API...');
  
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API error (${response.status}): ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log('\n✅ SQL executed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2).substring(0, 500));

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }

  // Get the API keys
  console.log('\n🔑 Fetching API keys...');
  try {
    const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    if (keysResponse.ok) {
      const keys = await keysResponse.json();
      for (const key of keys) {
        if (key.name === 'service_role') {
          console.log(`\n📋 Service Role Key: ${key.api_key}`);
          console.log('\n⚠️  Add this to your .env file:');
          console.log(`SUPABASE_SERVICE_ROLE_KEY=${key.api_key}`);
        }
      }
    }
  } catch (err) {
    console.log(`Could not fetch API keys: ${err.message}`);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
