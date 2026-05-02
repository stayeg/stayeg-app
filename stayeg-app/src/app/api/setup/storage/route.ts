/**
 * POST /api/setup/storage
 * 
 * Creates required Supabase Storage buckets for file uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminSecret } from '@/lib/api-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const secretError = requireAdminSecret(request);
  if (secretError) return secretError;

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const buckets = ['avatars', 'kyc-documents', 'pg-images'];
    const results: { bucket: string; success: boolean; message: string }[] = [];

    for (const bucket of buckets) {
      try {
        // Check if bucket exists
        const { data: existing } = await adminClient.storage.listBuckets();
        const bucketExists = existing?.some(b => b.name === bucket);

        if (bucketExists) {
          results.push({ bucket, success: true, message: 'Bucket already exists' });
          continue;
        }

        // Create bucket
        const { error } = await adminClient.storage.createBucket(bucket, {
          public: bucket !== 'kyc-documents', // KYC docs are private
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: bucket === 'kyc-documents'
            ? ['image/jpeg', 'image/png', 'application/pdf']
            : ['image/jpeg', 'image/png', 'image/webp'],
        });

        if (error) {
          results.push({ bucket, success: false, message: error.message });
        } else {
          results.push({ bucket, success: true, message: 'Bucket created successfully' });
        }
      } catch (err: any) {
        results.push({ bucket, success: false, message: err.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'Storage buckets ready!' : 'Some buckets failed to create',
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
