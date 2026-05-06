/**
 * PUT /api/pgs/bank-details
 *
 * Updates bank account details for a PG owner's property.
 * Only the PG owner can update their own bank details.
 * Bank account number is masked in the response for security.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';
import { captureException } from '@/lib/sentry-server';
import { isValidIFSC } from '@/lib/validation';

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { pgId, bankAccountName, bankAccountNumber, bankIfscCode, bankName, bankBranch, upiId } = body;

    if (!pgId) {
      return NextResponse.json({ error: 'pgId is required' }, { status: 400 });
    }

    // Verify ownership (unless admin)
    if (authResult.user.role !== 'ADMIN') {
      const { data: pg, error: pgError } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', pgId)
        .single();

      if (pgError || !pg) {
        return NextResponse.json({ error: 'PG not found' }, { status: 404 });
      }
      if (pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden: you can only update your own PGs' }, { status: 403 });
      }
    }

    // Build update object — only include provided fields, with validation
    const updateData: Record<string, unknown> = {};
    if (bankAccountName !== undefined) updateData.bank_account_name = String(bankAccountName).trim().slice(0, 100);
    if (bankAccountNumber !== undefined) {
      const acctNum = String(bankAccountNumber).trim();
      if (acctNum.length < 8 || acctNum.length > 18 || !/^\d+$/.test(acctNum)) {
        return NextResponse.json({ error: 'Bank account number must be 8-18 digits' }, { status: 400 });
      }
      updateData.bank_account_number = acctNum;
    }
    if (bankIfscCode !== undefined) {
      if (!isValidIFSC(bankIfscCode)) {
        return NextResponse.json({ error: 'Invalid IFSC code format (e.g., SBIN0001234)' }, { status: 400 });
      }
      updateData.bank_ifsc_code = bankIfscCode.trim().toUpperCase();
    }
    if (bankName !== undefined) updateData.bank_name = String(bankName).trim().slice(0, 100);
    if (bankBranch !== undefined) updateData.bank_branch = String(bankBranch).trim().slice(0, 100);
    if (upiId !== undefined) {
      const upi = String(upiId).trim();
      if (upi && !upi.includes('@')) {
        return NextResponse.json({ error: 'Invalid UPI ID format' }, { status: 400 });
      }
      updateData.upi_id = upi;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No bank details provided to update' }, { status: 400 });
    }

    const { data: pg, error } = await supabaseAdmin
      .from('pgs')
      .update(updateData)
      .eq('id', pgId)
      .select('id, name, bank_account_name, bank_account_number, bank_ifsc_code, bank_name, bank_branch, upi_id')
      .single();

    if (error) throw error;

    // Mask bank account number in response for security
    const maskedPg = {
      ...pg,
      bank_account_number: pg.bank_account_number
        ? `****${pg.bank_account_number.slice(-4)}`
        : null,
    };

    return NextResponse.json(maskedPg);
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/pgs/bank-details' });
    console.error('Error updating bank details:', error);
    return NextResponse.json({ error: 'Failed to update bank details' }, { status: 500 });
  }
}

/**
 * GET /api/pgs/bank-details?pgId=xxx
 *
 * Returns bank details for a specific PG (owner only, with masking).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const pgId = searchParams.get('pgId');

    if (!pgId) {
      return NextResponse.json({ error: 'pgId is required' }, { status: 400 });
    }

    // Verify ownership (unless admin)
    if (authResult.user.role !== 'ADMIN') {
      const { data: pg, error: pgError } = await supabaseAdmin
        .from('pgs')
        .select('owner_id')
        .eq('id', pgId)
        .single();

      if (pgError || !pg) {
        return NextResponse.json({ error: 'PG not found' }, { status: 404 });
      }
      if (pg.owner_id !== authResult.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: pg, error } = await supabaseAdmin
      .from('pgs')
      .select('id, name, bank_account_name, bank_account_number, bank_ifsc_code, bank_name, bank_branch, upi_id')
      .eq('id', pgId)
      .single();

    if (error) throw error;

    // Mask bank account number for security
    const maskedPg = {
      ...pg,
      bank_account_number: pg.bank_account_number
        ? `****${pg.bank_account_number.slice(-4)}`
        : null,
    };

    return NextResponse.json(maskedPg);
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/pgs/bank-details' });
    console.error('Error fetching bank details:', error);
    return NextResponse.json({ error: 'Failed to fetch bank details' }, { status: 500 });
  }
}
