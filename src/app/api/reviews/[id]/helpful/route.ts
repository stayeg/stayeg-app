import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

// PATCH /api/reviews/[id]/helpful — Mark review as helpful (authenticated users only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { id: reviewId } = await params;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    // Prevent double-voting: check if user already voted
    const { data: existingVote } = await supabaseAdmin
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', authResult.user.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted this review as helpful' }, { status: 409 });
    }

    // Fetch current helpful_count
    const { data: review, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('id, helpful_count')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Update helpful_count with incremented value
    const newCount = (review.helpful_count || 0) + 1;
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({ helpful_count: newCount })
      .eq('id', reviewId)
      .select('id, helpful_count')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    // Record the vote to prevent duplicates
    await supabaseAdmin
      .from('review_helpful_votes')
      .insert({ review_id: reviewId, user_id: authResult.user.id });

    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('PATCH /api/reviews/[id]/helpful error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
