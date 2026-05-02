import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWithRole } from '@/lib/api-auth';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET(request: NextRequest) {
  try {
    // Role enforcement: analytics are owner/admin only
    const authResult = await requireSessionWithRole(request, ['OWNER', 'ADMIN']);
    if ('error' in authResult) return authResult.error;

    const ownerId = authResult.user.id;

    // Allow admins to view other owners' analytics
    const requestedOwnerId = request.nextUrl.searchParams.get('ownerId');
    const effectiveOwnerId = requestedOwnerId && authResult.user.role === 'ADMIN' ? requestedOwnerId : ownerId;

    // ----------------------------------------------------------------
    // 1. PGs & Rooms & Beds
    // ----------------------------------------------------------------
    const [pgsRes, roomsRes, bedsRes] = await Promise.all([
      supabaseAdmin.from('pgs').select('id').eq('owner_id', effectiveOwnerId),
      supabaseAdmin.from('rooms').select('id, pg_id').in('pg_id',
        (await supabaseAdmin.from('pgs').select('id').eq('owner_id', effectiveOwnerId)).data?.map(p => p.id) || ['__none__']
      ),
      supabaseAdmin.from('beds').select('id, status, room_id').in('room_id',
        (await supabaseAdmin.from('rooms').select('id').in('pg_id',
          (await supabaseAdmin.from('pgs').select('id').eq('owner_id', effectiveOwnerId)).data?.map(p => p.id) || ['__none__']
        )).data?.map(r => r.id) || ['__none__']
      ),
    ]);

    const totalPGs = pgsRes.data?.length ?? 0;
    const totalRooms = roomsRes.data?.length ?? 0;
    const beds = bedsRes.data ?? [];
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b: { status: string }) => b.status === 'OCCUPIED').length;
    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // ----------------------------------------------------------------
    // 2. Tenants (users with active bookings in this owner's PGs)
    // ----------------------------------------------------------------
    const pgIds = pgsRes.data?.map((p: { id: string }) => p.id) || [];
    let totalTenants = 0;
    let activeTenants = 0;

    if (pgIds.length > 0) {
      const bookingsRes = await supabaseAdmin
        .from('bookings')
        .select('user_id, status')
        .in('pg_id', pgIds);

      const bookings = bookingsRes.data ?? [];
      const uniqueUserIds = new Set(bookings.map((b: { user_id: string }) => b.user_id));
      totalTenants = uniqueUserIds.size;
      activeTenants = new Set(
        bookings.filter((b: { status: string }) => ['ACTIVE', 'CONFIRMED'].includes(b.status))
          .map((b: { user_id: string }) => b.user_id)
      ).size;
    }

    // ----------------------------------------------------------------
    // 3. Payments — revenue & payment status
    // ----------------------------------------------------------------
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyRevenue = 0;
    let pendingPayments = 0;
    let pendingAmount = 0;

    if (pgIds.length > 0) {
      const paymentsRes = await supabaseAdmin
        .from('payments')
        .select('amount, status, created_at')
        .in('pg_id', pgIds);

      const payments = paymentsRes.data ?? [];

      // Monthly revenue = sum of COMPLETED payments for the current month
      monthlyRevenue = payments
        .filter((p: { status: string; created_at: string }) =>
          p.status === 'COMPLETED' && p.created_at?.startsWith(currentMonth)
        )
        .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);

      // Pending payments
      const pendingRecs = payments.filter((p: { status: string }) => p.status === 'PENDING');
      pendingPayments = pendingRecs.length;
      pendingAmount = pendingRecs.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
    }

    // ----------------------------------------------------------------
    // 4. Open complaints
    // ----------------------------------------------------------------
    let openComplaints = 0;
    if (pgIds.length > 0) {
      const complaintsRes = await supabaseAdmin
        .from('complaints')
        .select('id')
        .in('pg_id', pgIds)
        .in('status', ['OPEN', 'IN_PROGRESS']);
      openComplaints = complaintsRes.data?.length ?? 0;
    }

    // ----------------------------------------------------------------
    // 5. Recent activity (from activity_log table)
    // ----------------------------------------------------------------
    let recentActivity: { action: string; description: string; createdAt: string }[] = [];
    try {
      const logsRes = await supabaseAdmin
        .from('activity_log')
        .select('action, details, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(20);

      recentActivity = (logsRes.data ?? []).map((log: { action: string; details: string | null; created_at: string }) => ({
        action: log.action,
        description: log.details ?? '',
        createdAt: log.created_at,
      }));
    } catch {
      // activity_log table may not exist yet — return empty
    }

    // ----------------------------------------------------------------
    // 6. Revenue trend (last 6 months)
    // ----------------------------------------------------------------
    const revenueTrend: { month: string; revenue: number }[] = [];
    if (pgIds.length > 0) {
      const paymentsRes = await supabaseAdmin
        .from('payments')
        .select('amount, status, created_at')
        .in('pg_id', pgIds)
        .eq('status', 'COMPLETED');

      const completedPayments = paymentsRes.data ?? [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const revenue = completedPayments
          .filter((p: { created_at: string }) => p.created_at?.startsWith(monthKey))
          .reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
        revenueTrend.push({
          month: MONTH_NAMES[d.getMonth()],
          revenue,
        });
      }
    }

    // ----------------------------------------------------------------
    // 7. Rent Due / Overdue
    // ----------------------------------------------------------------
    let rentDue: {
      tenantName: string;
      phone: string;
      pgName: string;
      roomLabel: string;
      bedLabel: string;
      amount: number;
      dueDate: string;
      dueDay: number;
      status: string;
    }[] = [];

    if (pgIds.length > 0) {
      const DUE_DAY = 5;
      const today = now.getDate();

      // Only include when rent is approaching or past due
      if (today >= DUE_DAY - 3) {
        // Fetch active bookings with user, bed (room), and pg info via Supabase joins
        const activeBookingsRes = await supabaseAdmin
          .from('bookings')
          .select(`
            id, user_id, pg_id, bed_id,
            users:user_id (name, phone),
            beds:bed_id (bed_number, price, room_id, rooms:room_id (room_code)),
            pgs:pg_id (name)
          `)
          .in('pg_id', pgIds)
          .in('status', ['ACTIVE', 'CONFIRMED']);

        const activeBookings = activeBookingsRes.data ?? [];

        if (activeBookings.length > 0) {
          // Fetch all completed RENT payments for current month across owner's PGs
          const rentPaymentsRes = await supabaseAdmin
            .from('payments')
            .select('booking_id, user_id, pg_id, created_at')
            .in('pg_id', pgIds)
            .eq('type', 'RENT')
            .eq('status', 'COMPLETED');

          // Build a set of keys identifying tenants who have paid this month
          // Key can be booking_id directly, or "user_id:pg_id" as fallback
          const paidKeys = new Set(
            (rentPaymentsRes.data ?? [])
              .filter((p: { created_at: string }) => p.created_at?.startsWith(currentMonth))
              .map((p: { booking_id: string; user_id: string; pg_id: string }) =>
                p.booking_id || `${p.user_id}:${p.pg_id}`
              )
          );

          const dueDate = new Date(now.getFullYear(), now.getMonth(), DUE_DAY);
          const dueDateStr = dueDate.toISOString();

          for (const booking of activeBookings) {
            // Skip if already paid this month
            const bookingKey = booking.id || `${booking.user_id}:${booking.pg_id}`;
            if (paidKeys.has(bookingKey)) continue;
            // Also check the composite key even if booking.id exists
            if (booking.user_id && booking.pg_id && paidKeys.has(`${booking.user_id}:${booking.pg_id}`)) continue;

            const user = (booking.users as { name: string; phone: string | null } | null) || {};
            const bed = (booking.beds as { bed_number: number; price: number | null; rooms: { room_code: string } | null } | null) || {};
            const pg = (booking.pgs as { name: string } | null) || {};
            const room = bed.rooms || {};

            let status: string;
            if (today > DUE_DAY) {
              status = 'OVERDUE';
            } else {
              status = 'DUE_SOON';
            }

            rentDue.push({
              tenantName: user.name || 'Unknown',
              phone: user.phone || '',
              pgName: pg.name || 'Unknown PG',
              roomLabel: room.room_code || '',
              bedLabel: `Bed ${bed.bed_number || ''}`,
              amount: bed.price || 0,
              dueDate: dueDateStr,
              dueDay: DUE_DAY,
              status,
            });
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // Response
    // ----------------------------------------------------------------
    return NextResponse.json({
      totalPGs,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      vacantBeds: availableBeds,
      occupancyRate,
      totalTenants,
      activeTenants,
      monthlyRevenue,
      pendingPayments,
      pendingAmount,
      openComplaints,
      recentActivity,
      revenueTrend,
      rentDue,
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
