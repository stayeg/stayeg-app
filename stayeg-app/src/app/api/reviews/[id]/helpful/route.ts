import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/reviews/[id]/helpful — Mark review as helpful
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({ helpful_count: supabaseAdmin.raw('helpful_count + 1') })
      .eq('id', reviewId)
      .select('id, helpful_count')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('PATCH /api/reviews/[id]/helpful error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
