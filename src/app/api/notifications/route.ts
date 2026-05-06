/**
 * Notifications API — StayEg v1.2
 *
 * GET  /api/notifications          — List user notifications
 * POST /api/notifications         — Create notification (server-side)
 * PUT  /api/notifications         — Mark as read
 */

import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

// GET /api/notifications — List user's notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;
    if (error) {
      console.error('GET /api/notifications error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Also return unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    captureException(error, { endpoint: 'GET /api/notifications' });
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — Create notification
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, title, message, type, data } = body;

    // Users can only create notifications for themselves
    const targetUserId = authResult.user.role === 'TENANT' ? authResult.user.id : userId;
    if (!targetUserId || !title || !message) {
      return NextResponse.json({ error: 'userId, title, and message required' }, { status: 400 });
    }

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: targetUserId,
        title,
        message,
        type: type || 'INFO',
        data: data || {},
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/notifications' });
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT /api/notifications — Mark as read
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      // Mark all as read
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', authResult.user.id)
        .eq('is_read', false);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json({ error: 'id or markAll required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', authResult.user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    captureException(error, { endpoint: 'PUT /api/notifications' });
    console.error('PUT /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
