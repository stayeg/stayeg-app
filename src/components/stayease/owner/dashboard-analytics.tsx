'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2, BedDouble, Users, IndianRupee, AlertTriangle,
  Activity, CalendarDays, CreditCard, MessageSquare, TrendingUp,
  TrendingDown, Phone, Clock, ChevronRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { CARD_BG, TEXT_COLOR } from '@/lib/constants';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function OwnerDashboard() {
  const { setCurrentView, currentUser } = useAppStore();
  const [showBenefits, setShowBenefits] = useState(false);

  const ownerId = currentUser?.id;

  const { data: analytics, isLoading: analyticsLoading, isError, refetch } = useQuery({
    queryKey: ['owner-analytics', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/analytics?ownerId=${ownerId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: !!ownerId,
    refetchInterval: 30000,
  });

  const { data: ownerPGs, isLoading: pgsLoading } = useQuery({
    queryKey: ['owner-pgs', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      if (!res.ok) throw new Error('Failed to fetch PGs');
      return res.json();
    },
    enabled: !!ownerId,
  });

  const ownerPgIds = useMemo(() => ownerPGs?.map((p: { id: string }) => p.id) || [], [ownerPGs]);

  const { data: complaints } = useQuery({
    queryKey: ['owner-complaints', ownerPgIds],
    queryFn: async () => {
      if (ownerPgIds.length === 0) return [];
      const results = await Promise.all(
        ownerPgIds.map((id: string) => authFetch(`/api/complaints?pgId=${id}`).then(r => r.json()).catch(() => []))
      );
      return results.flat();
    },
    enabled: ownerPgIds.length > 0,
  });

  const openComplaints = complaints?.filter(
    (c: { status: string }) => c.status === 'OPEN' || c.status === 'IN_PROGRESS'
  ).length || 0;

  const isLoading = analyticsLoading || pgsLoading;

  const statCards = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        title: 'Total PGs',
        value: analytics.totalPGs || ownerPGs?.length || 0,
        icon: Building2,
        bgColor: 'bg-brand-teal/10',
        textColor: 'text-brand-teal',
        trend: analytics.totalPGs > 1 ? '+active' : null,
      },
      {
        title: 'Total Beds',
        value: analytics.totalBeds || 0,
        icon: BedDouble,
        bgColor: CARD_BG.blue,
        textColor: TEXT_COLOR.blue,
        trend: null,
      },
      {
        title: 'Occupied Beds',
        value: analytics.occupiedBeds || 0,
        icon: Users,
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        trend: analytics.occupancyRate > 80 ? 'High demand' : null,
      },
      {
        title: 'Occupancy Rate',
        value: `${analytics.occupancyRate || 0}%`,
        icon: Activity,
        bgColor: CARD_BG.purple,
        textColor: TEXT_COLOR.purple,
        trend: (analytics.occupancyRate || 0) >= 90 ? 'Excellent' : null,
      },
      {
        title: 'Monthly Revenue',
        value: formatCurrency(analytics.monthlyRevenue || 0),
        icon: IndianRupee,
        bgColor: CARD_BG.green,
        textColor: TEXT_COLOR.green,
        trend: analytics.revenueTrend?.length ? (analytics.revenueTrend[analytics.revenueTrend.length - 1]?.revenue > (analytics.revenueTrend[analytics.revenueTrend.length - 2]?.revenue || 0) ? 'up' : 'down') : null,
      },
      {
        title: 'Pending Payments',
        value: formatCurrency(analytics.pendingPayments || analytics.pendingAmount || 0),
        icon: CalendarDays,
        bgColor: CARD_BG.yellow,
        textColor: TEXT_COLOR.yellow,
        trend: (analytics.pendingPayments || analytics.pendingAmount || 0) > 0 ? 'Action needed' : null,
      },
      {
        title: 'Active Tenants',
        value: analytics.totalTenants || 0,
        icon: Users,
        bgColor: CARD_BG.blue,
        textColor: TEXT_COLOR.blue,
        trend: null,
      },
      {
        title: 'Open Complaints',
        value: openComplaints,
        icon: AlertTriangle,
        bgColor: CARD_BG.red,
        textColor: TEXT_COLOR.red,
        trend: openComplaints > 0 ? 'Needs attention' : null,
      },
    ];
  }, [analytics, ownerPGs, openComplaints]);

  const quickActions = [
    { label: 'Add PG', icon: Building2, view: 'OWNER_PGS' as const, color: 'from-brand-deep to-brand-teal' },
    { label: 'View Tenants', icon: Users, view: 'OWNER_TENANTS' as const, color: 'from-emerald-500 to-green-600' },
    { label: 'Rooms & Beds', icon: BedDouble, view: 'OWNER_ROOMS' as const, color: 'from-teal-500 to-cyan-500' },
    { label: 'Collect Rent', icon: CreditCard, view: 'OWNER_RENT' as const, color: 'from-amber-500 to-orange-500' },
    { label: 'Complaints', icon: MessageSquare, view: 'OWNER_COMPLAINTS' as const, color: 'from-red-500 to-rose-500' },
    { label: 'Vendors', icon: Phone, view: 'OWNER_VENDORS' as const, color: 'from-violet-500 to-purple-500' },
  ];

  const rentDue = analytics?.rentDue || [];
  const recentActivity = analytics?.recentActivity || [];

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Error Banner */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Failed to load dashboard data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Please check your connection and try again.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">Retry</Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {currentUser?.name || 'Owner'}!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-brand-teal border-brand-teal/20 bg-brand-teal/10 px-3 py-1.5">
            <Activity className="size-3.5 mr-1.5" />
            Live
          </Badge>
        </div>
      </div>

      {/* Benefits Section (collapsible) */}
      {showBenefits && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Card className="border-brand-teal/20 bg-gradient-to-r from-brand-teal/5 to-brand-deep/5">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3">Why use StayEg for your PG?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: CreditCard, title: 'Track Rent Easily', desc: 'Auto reminders, digital payments' },
                  { icon: Clock, title: 'Save Time', desc: 'Manage everything from phone' },
                  { icon: Users, title: 'Get More Tenants', desc: 'Verified listing, QR onboarding' },
                  { icon: TrendingUp, title: 'All-in-One', desc: 'Beds, rent, complaints, staff' },
                ].map((b) => (
                  <div key={b.title} className="flex items-start gap-2 p-3 bg-background/60 rounded-lg">
                    <b.icon className="size-4 text-brand-teal mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{b.title}</p>
                      <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                    <p className={`text-lg md:text-xl font-bold mt-1 ${stat.textColor} truncate`}>{stat.value}</p>
                    {stat.trend && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                        {stat.trend === 'up' ? <ArrowUpRight className="size-3 text-emerald-600" /> :
                         stat.trend === 'down' ? <ArrowDownRight className="size-3 text-red-500" /> : null}
                        {stat.trend}
                      </p>
                    )}
                  </div>
                  <div className={`${stat.bgColor} p-2.5 rounded-xl shrink-0`}>
                    <stat.icon className={`size-4 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setCurrentView(action.view)}
            className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-card border border-border hover:shadow-md transition-all active:scale-95"
          >
            <div className={`bg-gradient-to-br ${action.color} p-2.5 rounded-xl`}>
              <action.icon className="size-4 md:size-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-foreground text-center">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Alert Banners */}
      {(rentDue.length > 0 || openComplaints > 0) && (
        <div className="space-y-3">
          {rentDue.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card
                className="border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentView('OWNER_RENT')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-amber-100 p-2.5 rounded-xl shrink-0">
                    <CalendarDays className="size-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-700">{rentDue.length} Rent Due / Overdue</p>
                    <p className="text-sm text-amber-600/80 truncate">
                      {rentDue.slice(0, 2).map((r: { tenantName: string; amount: number }) => `${r.tenantName} (${formatCurrency(r.amount)})`).join(', ')}
                      {rentDue.length > 2 && ` +${rentDue.length - 2} more`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-amber-400 shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          )}
          {openComplaints > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Card
                className="border-destructive/20 bg-destructive/5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentView('OWNER_COMPLAINTS')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-destructive/15 p-2.5 rounded-xl shrink-0">
                    <AlertTriangle className="size-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-destructive">{openComplaints} Open Complaints</p>
                    <p className="text-sm text-destructive/80">Requires your attention</p>
                  </div>
                  <ChevronRight className="size-5 text-destructive/60 shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Revenue Trend + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Trend Mini Chart */}
        {analytics?.revenueTrend?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-brand-teal" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {analytics.revenueTrend.slice(-6).map((item: { month: string; revenue: number }, idx: number) => {
                  const maxRev = Math.max(...analytics.revenueTrend.slice(-6).map((r: { revenue: number }) => r.revenue), 1);
                  const height = Math.max(8, (item.revenue / maxRev) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatCurrency(item.revenue)}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                        className="w-full bg-gradient-to-t from-brand-deep to-brand-teal rounded-t-md min-h-[8px]"
                      />
                      <span className="text-[9px] text-muted-foreground">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-4 text-brand-teal" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentActivity.slice(0, 8).map((item: { action: string; description: string; createdAt: string }, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5 bg-muted p-1.5 rounded-lg shrink-0">
                      {item.action.includes('TENANT') ? <Users className="size-3.5 text-brand-teal" /> :
                       item.action.includes('PAYMENT') ? <CreditCard className="size-3.5 text-emerald-600" /> :
                       item.action.includes('BED') ? <BedDouble className="size-3.5 text-teal-600" /> :
                       <Activity className="size-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.description || item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                No activity yet. Start by adding a PG!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rent Due List */}
      {rentDue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="size-4 text-amber-500" />
              Rent Due / Overdue ({rentDue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {rentDue.map((r: { tenantName: string; phone: string; amount: number; dueDay: number; pgName: string; status: string }, i: number) => {
                const waMsg = encodeURIComponent(
                  `Hi ${r.tenantName}, your rent of ${formatCurrency(r.amount)} for this month is due. Please pay at the earliest. - ${currentUser?.name || 'StayEg Owner'}`
                );
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.tenantName}</p>
                      <p className="text-xs text-muted-foreground">{r.pgName} &bull; Due day: {r.dueDay}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(r.amount)}</p>
                      <Badge className={`${r.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} text-[10px] px-1.5 py-0`}>
                        {r.status === 'OVERDUE' ? 'Overdue' : 'Due Today'}
                      </Badge>
                    </div>
                    {r.phone && (
                      <a
                        href={`https://wa.me/${r.phone.replace(/\D/g, '')}?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors shrink-0"
                        title="Send WhatsApp reminder"
                      >
                        <Phone className="size-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Info */}
      <Card className="border-brand-teal/20 bg-gradient-to-r from-brand-teal/5 to-brand-deep/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Your Plan</h3>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">1 Year Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Free access until {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade anytime for advanced features</p>
            </div>
            <Button variant="outline" size="sm" className="border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10 shrink-0" disabled>
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
