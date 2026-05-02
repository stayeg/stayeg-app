import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

// GET /api/reviews?pgId=xxx — List reviews for a PG
export async function GET(request: NextRequest) {
  try {
    const pgId = request.nextUrl.searchParams.get('pgId');
    if (!pgId) {
      return NextResponse.json({ error: 'pgId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id, pg_id, user_id, rating, cleanliness, safety, value_for_money, amenities, management,
        comment, helpful_count, is_flagged, created_at,
        users:user_id (name, avatar)
      `)
      .eq('pg_id', pgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('GET /api/reviews error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('GET /api/reviews error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/reviews — Create a review (auth required)
export async function POST(request: NextRequest) {
  try {
    // Auth guard: require login to post reviews
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { pgId, rating, cleanliness, safety, valueForMoney, amenities, management, comment } = body;

    if (!pgId || !rating || !comment) {
      return NextResponse.json(
        { error: 'pgId, rating, and comment are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Force userId to authenticated user
    const reviewUserId = authResult.user.id;

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        pg_id: pgId,
        user_id: reviewUserId,
        rating: Math.round(rating),
        cleanliness: Math.round(cleanliness || 0),
        safety: Math.round(safety || 0),
        value_for_money: Math.round(valueForMoney || 0),
        amenities: Math.round(amenities || 0),
        management: Math.round(management || 0),
        comment: comment.trim().slice(0, 2000),
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('POST /api/reviews error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You have already reviewed this PG' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/reviews error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/reviews — Mark review as helpful (accepts id from body)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    // Fetch current helpful_count first, then increment/decrement
    const { data: currentReview, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('helpful_count')
      .eq('id', id)
      .single();

    if (fetchError || !currentReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const increment = action === 'unhelpful' ? -1 : 1;
    const newCount = Math.max(0, (currentReview.helpful_count || 0) + increment);

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({ helpful_count: newCount })
      .eq('id', id)
      .select('id, helpful_count')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('PATCH /api/reviews error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
