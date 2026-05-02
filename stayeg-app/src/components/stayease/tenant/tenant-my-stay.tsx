'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isPast, isToday, addMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  Home, MapPin, BedDouble, IndianRupee, CalendarDays, Phone,
  MessageCircle, CreditCard, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, Download, ShieldCheck, Star, FileText, Package,
  LogOut, Search, BadgeCheck, User, ChevronDown, ChevronUp,
  UtensilsCrossed, Shirt, BookOpen, Sparkles, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '@/lib/animations';
import { STATUSES } from '@/lib/constants';
import VerificationBadge from '@/components/stayease/tenant/verification-badge';
import type { Booking, Payment, PG } from '@/lib/types';

// ---------------------------------------------------------------------------
// Move-in checklist items
// ---------------------------------------------------------------------------
const MOVE_IN_CHECKLIST = [
  { id: 'id_proof', label: 'ID Proof (Aadhaar/PAN/Passport)', icon: BadgeCheck },
  { id: 'photos', label: 'Passport-size photographs (4 nos)', icon: FileText },
  { id: 'bedding', label: 'Bed sheets, pillow & blanket', icon: BedDouble },
  { id: 'toiletries', label: 'Toiletries & personal hygiene kit', icon: Sparkles },
  { id: 'clothes', label: 'Clothes & hangers', icon: Shirt },
  { id: 'laptop', label: 'Laptop / study materials', icon: BookOpen },
  { id: 'utensils', label: 'Personal water bottle & utensils', icon: UtensilsCrossed },
  { id: 'medicines', label: 'Basic first-aid & medicines', icon: Package },
  { id: 'locks', label: 'Padlock for cupboard/locker', icon: ShieldCheck },
  { id: 'shoes', label: 'Slippers & formal shoes', icon: Home },
];

// ---------------------------------------------------------------------------
// Default house rules
// ---------------------------------------------------------------------------
const DEFAULT_HOUSE_RULES = [
  'No smoking inside the rooms or common areas.',
  'Visitor timings: 10:00 AM – 8:00 PM. Overnight guests not allowed without permission.',
  'Maintain cleanliness in your room and shared spaces.',
  'No loud music or noise after 10:00 PM.',
  'Non-vegetarian food is not allowed in common kitchen (if applicable).',
  'Electrical appliances above 500W are not permitted in rooms.',
  'Report any maintenance issues to the manager immediately.',
  'Rent must be paid by the 5th of every month.',
  'Security deposit is refundable subject to room condition at vacating.',
  'Any damage to PG property will be deducted from security deposit.',
];

// ---------------------------------------------------------------------------
// Local storage helper for checklist persistence
// ---------------------------------------------------------------------------
const CHECKLIST_KEY = 'stayeg_movein_checklist';

function loadChecklist(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklist(data: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function snakeToCamel(str: string) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function formatCurrency(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function getPaymentStatusColor(status: string) {
  const s = STATUSES.PAYMENT[status as keyof typeof STATUSES.PAYMENT];
  return s?.color || 'bg-gray-100 text-gray-800';
}

function getPaymentStatusLabel(status: string) {
  const s = STATUSES.PAYMENT[status as keyof typeof STATUSES.PAYMENT];
  return s?.label || status;
}

function isOverdue(dueDate: string | undefined, status: string) {
  if (status !== 'PENDING' || !dueDate) return false;
  return isPast(parseISO(dueDate)) && !isToday(parseISO(dueDate));
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TenantMyStay() {
  const { currentUser, setCurrentView, setSelectedPG } = useAppStore();

  // Data state
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [pgDetails, setPgDetails] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [moveOutOpen, setMoveOutOpen] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState('');
  const [moveOutReason, setMoveOutReason] = useState('');
  const [movingOut, setMovingOut] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [paymentTab, setPaymentTab] = useState('recent');

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all bookings for user
      const bookingsRes = await authFetch(`/api/bookings?userId=${currentUser.id}`);
      if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');
      const allBookings: any[] = await bookingsRes.json();

      // 2. Find active booking
      const active = allBookings.find((b) => b.status === 'ACTIVE');
      const past = allBookings.filter((b) => ['COMPLETED', 'CANCELLED'].includes(b.status));

      setActiveBooking(active || null);
      setPastBookings(past);

      if (active) {
        // 3. Fetch PG details
        const pgRes = await authFetch(`/api/pgs/${active.pg_id}`);
        if (pgRes.ok) {
          const pgData = await pgRes.json();
          setPgDetails(pgData);
        }

        // 4. Fetch payments for this PG
        const payRes = await authFetch(`/api/payments?userId=${currentUser.id}&pgId=${active.pg_id}`);
        if (payRes.ok) {
          const payData = await payRes.json();
          setPayments(payData || []);
        }
      }
    } catch (err) {
      console.error('Error fetching my stay data:', err);
      setError('Something went wrong while loading your stay details.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const saved = loadChecklist();
    setChecklist(saved);
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------
  const currentMonthPayment = useMemo(() => {
    if (!payments.length) return null;
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return payments.find((p) => {
      if (p.type !== 'RENT') return false;
      try {
        const d = new Date(p.created_at || p.paid_date || p.due_date);
        return d.getMonth() === month && d.getFullYear() === year;
      } catch {
        return false;
      }
    }) || null;
  }, [payments]);

  const rentPayments = useMemo(() => {
    return payments.filter((p) => p.type === 'RENT').sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [payments]);

  const recentPayments = useMemo(() => rentPayments.slice(0, 3), [rentPayments]);

  const monthlyRent = activeBooking
    ? (pgDetails?.price || activeBooking.advance_paid || 0)
    : 0;

  const checklistProgress = useMemo(() => {
    const total = MOVE_IN_CHECKLIST.length;
    const checked = MOVE_IN_CHECKLIST.filter((item) => checklist[item.id]).length;
    return Math.round((checked / total) * 100);
  }, [checklist]);

  const houseRules = useMemo(() => {
    if (pgDetails?.description) {
      // Try to extract rules from description (newline-separated lines starting with - or *)
      const lines = pgDetails.description.split('\n');
      const rules = lines.filter((l: string) => /^[-*•]/.test(l.trim())).map((l: string) => l.replace(/^[-*•]\s*/, '').trim());
      return rules.length > 3 ? rules : DEFAULT_HOUSE_RULES;
    }
    return DEFAULT_HOUSE_RULES;
  }, [pgDetails]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handlePayRent = async (paymentId?: string) => {
    if (!currentUser || !activeBooking) return;
    setPayingId(paymentId || 'current');
    try {
      const res = await authFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          pgId: activeBooking.pg_id,
          bookingId: activeBooking.id,
          amount: monthlyRent,
          type: 'RENT',
          method: 'UPI',
        }),
      });
      if (res.ok) {
        toast.success('Rent paid successfully!');
        fetchData();
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  const handleMoveOut = async () => {
    if (!currentUser || !activeBooking || !moveOutDate) {
      toast.error('Please select a move-out date.');
      return;
    }
    setMovingOut(true);
    try {
      const res = await authFetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: activeBooking.id,
          status: 'CANCELLED',
        }),
      });
      if (res.ok) {
        toast.success('Move-out request submitted. You will be contacted by the PG manager.');
        setMoveOutOpen(false);
        setMoveOutDate('');
        setMoveOutReason('');
        fetchData();
      } else {
        toast.error('Failed to submit move-out request.');
      }
    } catch {
      toast.error('Failed to submit move-out request.');
    } finally {
      setMovingOut(false);
    }
  };

  const handleChecklistToggle = (id: string, checked: boolean) => {
    const updated = { ...checklist, [id]: checked };
    setChecklist(updated);
    saveChecklist(updated);
  };

  const handleViewPG = () => {
    if (pgDetails) {
      setSelectedPG(pgDetails as unknown as PG);
      setCurrentView('PG_DETAIL');
    }
  };

  const handleShowReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setReceiptOpen(true);
  };

  const pgImage = pgDetails?.images?.[0] || activeBooking?.pg?.images?.[0];
  const ownerInfo = pgDetails?.owner;

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Hero skeleton */}
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center px-4">
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="text-center">
          <AlertTriangle className="size-14 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">{error}</p>
          <Button onClick={fetchData} variant="outline">Try Again</Button>
        </motion.div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state (no active booking)
  // -----------------------------------------------------------------------
  if (!activeBooking) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="size-20 rounded-2xl bg-brand-teal/10 flex items-center justify-center mb-5">
              <Home className="size-10 text-brand-teal" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No Active Stay
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-8">
              You don&apos;t have an active stay right now. Find your perfect PG and book a comfortable room today!
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentView('PG_LISTING')}
                className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
              >
                <Search className="size-4 mr-2" />
                Find a PG
              </Button>
              {pastBookings.length > 0 && (
                <Button variant="outline" onClick={() => setCurrentView('MY_BOOKINGS')}>
                  <Clock className="size-4 mr-2" />
                  View Past Stays
                </Button>
              )}
            </div>

            {/* Past bookings quick list */}
            {pastBookings.length > 0 && (
              <motion.div
                variants={slideUp}
                initial="hidden"
                animate="visible"
                className="w-full mt-12"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Recent Past Stays
                </h3>
                <div className="space-y-3">
                  {pastBookings.slice(0, 3).map((b, i) => (
                    <motion.div
                      key={b.id}
                      variants={staggerItem}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: i * 0.08 }}
                    >
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {b.pg?.name || 'PG'}
                                </span>
                                <Badge className={`shrink-0 ${getPaymentStatusColor(b.status === 'CANCELLED' ? 'REFUNDED' : 'COMPLETED')}`}>
                                  {b.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {b.pg?.address}, {b.pg?.city}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground ml-3 shrink-0">
                              {b.check_in_date ? format(parseISO(b.check_in_date), 'MMM yyyy') : 'N/A'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main content — active stay
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* ================================================================ */}
          {/* 1. CURRENT STAY CARD (Hero Section)                              */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Card className="overflow-hidden border-0 shadow-lg">
              {/* PG Image Header */}
              {pgImage ? (
                <div className="relative h-44 sm:h-56 overflow-hidden">
                  <img
                    src={pgImage}
                    alt={pgDetails?.name || 'PG'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                            {pgDetails?.name || activeBooking.pg?.name || 'Your PG'}
                          </h1>
                          {pgDetails?.is_verified && (
                            <div className="shrink-0">
                              <ShieldCheck className="size-5 text-emerald-400 drop-shadow" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-white/80 text-sm">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">
                            {pgDetails?.address || activeBooking.pg?.address || 'Address'}, {pgDetails?.city || activeBooking.pg?.city || 'City'}
                          </span>
                        </div>
                        {pgDetails?.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold text-white">
                              {pgDetails.rating?.toFixed(1)}
                            </span>
                            <span className="text-xs text-white/60">
                              ({pgDetails.total_reviews || 0} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="relative text-center">
                    <Home className="size-12 text-white/80 mx-auto mb-2" />
                    <h1 className="text-xl font-bold text-white">
                      {pgDetails?.name || activeBooking.pg?.name || 'Your PG'}
                    </h1>
                  </div>
                </div>
              )}

              {/* Stay details */}
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                      <BedDouble className="size-4 text-brand-teal" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Room / Bed</div>
                      <div className="text-sm font-semibold truncate">
                        {activeBooking.bed?.room?.room_code || 'N/A'} – Bed {activeBooking.bed?.bed_number || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="size-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Check-in</div>
                      <div className="text-sm font-semibold truncate">
                        {activeBooking.check_in_date
                          ? format(parseISO(activeBooking.check_in_date), 'dd MMM yyyy')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <IndianRupee className="size-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Monthly Rent</div>
                      <div className="text-sm font-semibold truncate">{formatCurrency(monthlyRent)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</div>
                      <div className="text-sm font-semibold text-emerald-700">Active Stay</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewPG}
                    className="gap-1.5 text-xs"
                  >
                    <Eye className="size-3.5" />
                    View PG Details
                    <ChevronRight className="size-3" />
                  </Button>
                  {pgDetails?.is_verified && (
                    <div className="flex items-center">
                      <VerificationBadge isVerified={true} compact />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ================================================================ */}
          {/* 2. RENT STATUS                                                   */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CreditCard className="size-4.5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Rent Status</CardTitle>
                    <CardDescription>
                      {format(new Date(), 'MMMM yyyy')} rent
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {currentMonthPayment ? (
                  <div className={`rounded-xl p-4 border ${
                    currentMonthPayment.status === 'COMPLETED'
                      ? 'bg-emerald-50 border-emerald-200'
                      : currentMonthPayment.status === 'PENDING' && isOverdue(currentMonthPayment.due_date, currentMonthPayment.status)
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(currentMonthPayment.amount || monthlyRent)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {currentMonthPayment.due_date
                            ? `Due: ${format(parseISO(currentMonthPayment.due_date), 'dd MMM yyyy')}`
                            : 'No due date set'}
                        </div>
                      </div>
                      <Badge className={getPaymentStatusColor(currentMonthPayment.status)}>
                        {isOverdue(currentMonthPayment.due_date, currentMonthPayment.status)
                          ? '⚠ Overdue'
                          : getPaymentStatusLabel(currentMonthPayment.status)}
                      </Badge>
                    </div>
                    {currentMonthPayment.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        <span>
                          Paid on {currentMonthPayment.paid_date
                            ? format(parseISO(currentMonthPayment.paid_date), 'dd MMM yyyy')
                            : 'N/A'}
                          {currentMonthPayment.method ? ` via ${currentMonthPayment.method}` : ''}
                        </span>
                      </div>
                    )}
                    {(currentMonthPayment.status === 'PENDING') && (
                      <Button
                        size="sm"
                        onClick={() => handlePayRent(currentMonthPayment.id)}
                        disabled={payingId === currentMonthPayment.id}
                        className={`w-full mt-1 text-white ${
                          isOverdue(currentMonthPayment.due_date, currentMonthPayment.status)
                            ? 'bg-destructive hover:bg-destructive/90'
                            : 'bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90'
                        }`}
                      >
                        {payingId === currentMonthPayment.id ? (
                          <>
                            <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <IndianRupee className="size-3.5 mr-1.5" />
                            {isOverdue(currentMonthPayment.due_date, currentMonthPayment.status) ? 'Pay Now — Urgent!' : 'Pay Now'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 border border-amber-200 bg-amber-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(monthlyRent)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due: {format(endOfMonth(new Date()), 'dd MMM yyyy')}
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePayRent()}
                      disabled={payingId === 'current'}
                      className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                    >
                      {payingId === 'current' ? (
                        <>
                          <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <IndianRupee className="size-3.5 mr-1.5" />
                          Pay Rent
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ================================================================ */}
          {/* 3. PAYMENT HISTORY                                               */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="size-4.5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Payment History</CardTitle>
                    <CardDescription>
                      {rentPayments.length} rent payment{rentPayments.length !== 1 ? 's' : ''} total
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {rentPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No rent payments yet.</p>
                  </div>
                ) : (
                  <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                    <TabsList className="bg-muted/50 rounded-lg mb-4 w-full">
                      <TabsTrigger value="recent" className="rounded-md flex-1 text-xs">Recent (3)</TabsTrigger>
                      <TabsTrigger value="all" className="rounded-md flex-1 text-xs">All ({rentPayments.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="recent" className="mt-0">
                      <ScrollArea className="max-h-96">
                        <div className="space-y-3">
                          {recentPayments.map((p, i) => renderPaymentRow(p, i))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="all" className="mt-0">
                      <ScrollArea className="max-h-96">
                        <div className="space-y-3">
                          {rentPayments.map((p, i) => renderPaymentRow(p, i))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ================================================================ */}
          {/* 4. MOVE-IN CHECKLIST                                              */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                    <Package className="size-4.5 text-brand-teal" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">Move-In Checklist</CardTitle>
                    <CardDescription>
                      {checklistProgress}% complete — {MOVE_IN_CHECKLIST.filter((i) => checklist[i.id]).length} of {MOVE_IN_CHECKLIST.length} items
                    </CardDescription>
                  </div>
                  {checklistProgress === 100 && (
                    <Badge className="bg-emerald-100 text-emerald-800 shrink-0">
                      <CheckCircle2 className="size-3 mr-1" />
                      All Done
                    </Badge>
                  )}
                </div>
                <Progress value={checklistProgress} className="h-2 mt-3" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MOVE_IN_CHECKLIST.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        checklist[item.id]
                          ? 'bg-brand-teal/5 border-brand-teal/20'
                          : 'bg-card border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={!!checklist[item.id]}
                        onCheckedChange={(checked) => handleChecklistToggle(item.id, !!checked)}
                        className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                      <item.icon className={`size-4 shrink-0 ${checklist[item.id] ? 'text-brand-teal' : 'text-muted-foreground'}`} />
                      <span className={`text-sm transition-colors ${checklist[item.id] ? 'text-foreground font-medium line-through decoration-brand-teal/40' : 'text-foreground/80'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ================================================================ */}
          {/* 5. IMPORTANT CONTACTS                                            */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Phone className="size-4.5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Important Contacts</CardTitle>
                    <CardDescription>Reach your PG owner & manager</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {ownerInfo ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border">
                      <div className="size-11 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                        <User className="size-5 text-brand-teal" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {ownerInfo.name || 'PG Owner'}
                        </div>
                        {ownerInfo.phone && (
                          <div className="text-xs text-muted-foreground">{ownerInfo.phone}</div>
                        )}
                        {ownerInfo.email && (
                          <div className="text-xs text-muted-foreground truncate">{ownerInfo.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {ownerInfo.phone && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                            asChild
                          >
                            <a href={`tel:${ownerInfo.phone}`}>
                              <Phone className="size-3.5 text-green-600" />
                              Call Owner
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                            asChild
                          >
                            <a
                              href={`https://wa.me/${ownerInfo.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="size-3.5 text-green-600" />
                              WhatsApp
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Phone className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Owner contact not available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ================================================================ */}
          {/* 6. HOUSE RULES                                                   */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setRulesExpanded(!rulesExpanded)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <FileText className="size-4.5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">House Rules</CardTitle>
                      <CardDescription>
                        {houseRules.length} rules to follow
                      </CardDescription>
                    </div>
                  </div>
                  {rulesExpanded ? (
                    <ChevronUp className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              <AnimatePresence>
                {rulesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <CardContent className="pt-0 pb-4">
                      <ScrollArea className="max-h-72">
                        <div className="space-y-3">
                          {houseRules.map((rule, i) => (
                            <div key={i} className="flex gap-3 items-start">
                              <div className="size-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-bold text-orange-700">{i + 1}</span>
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">{rule}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ================================================================ */}
          {/* 7. MOVE-OUT REQUEST                                              */}
          {/* ================================================================ */}
          <motion.div variants={staggerItem}>
            <Dialog open={moveOutOpen} onOpenChange={setMoveOutOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive gap-2"
                >
                  <LogOut className="size-4" />
                  Request Move-Out
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <LogOut className="size-5 text-destructive" />
                    Request Move-Out
                  </DialogTitle>
                  <DialogDescription>
                    Submitting a move-out request will notify your PG owner. Your booking will be cancelled.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="moveOutDate">Move-out Date</Label>
                    <input
                      id="moveOutDate"
                      type="date"
                      value={moveOutDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setMoveOutDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moveOutReason">Reason (optional)</Label>
                    <Textarea
                      id="moveOutReason"
                      placeholder="Let us know why you're moving out..."
                      value={moveOutReason}
                      onChange={(e) => setMoveOutReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="flex gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setMoveOutOpen(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleMoveOut}
                    disabled={movingOut || !moveOutDate}
                    className="flex-1 sm:flex-none"
                  >
                    {movingOut ? (
                      <>
                        <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <LogOut className="size-3.5 mr-1.5" />
                        Confirm Move-Out
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Stay duration badge */}
          <motion.div variants={staggerItem} className="text-center">
            <p className="text-xs text-muted-foreground">
              {activeBooking.check_in_date && (
                <>
                  Staying since {format(parseISO(activeBooking.check_in_date), 'dd MMM yyyy')}
                  {' · '}
                  {formatDistanceToNow(parseISO(activeBooking.check_in_date), { addSuffix: true })}
                </>
              )}
            </p>
          </motion.div>
        </motion.div>

        {/* ================================================================== */}
        {/* RECEIPT DIALOG                                                     */}
        {/* ================================================================== */}
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-brand-teal" />
                Payment Receipt
              </DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="border rounded-xl p-5 space-y-3 bg-muted/30">
                  <div className="text-center border-b pb-3">
                    <div className="text-lg font-bold text-brand-deep">StayEg</div>
                    <div className="text-xs text-muted-foreground">Payment Receipt</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receipt No.</span>
                      <span className="font-mono font-medium">{selectedPayment.id?.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PG Name</span>
                      <span className="font-medium">{selectedPayment.pg?.name || pgDetails?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenant</span>
                      <span className="font-medium">{currentUser?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Type</span>
                      <span className="font-medium">{selectedPayment.type || 'RENT'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold text-lg text-foreground">{formatCurrency(selectedPayment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getPaymentStatusColor(selectedPayment.status)}>
                        {getPaymentStatusLabel(selectedPayment.status)}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid On</span>
                      <span className="font-medium">
                        {selectedPayment.paid_date
                          ? format(parseISO(selectedPayment.paid_date), 'dd MMM yyyy, hh:mm a')
                          : 'N/A'}
                      </span>
                    </div>
                    {selectedPayment.method && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium">{selectedPayment.method}</span>
                      </div>
                    )}
                    {selectedPayment.due_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span className="font-medium">{format(parseISO(selectedPayment.due_date), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center pt-2 border-t">
                    <p className="text-[10px] text-muted-foreground">
                      Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')} · StayEg Platform
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Payment row renderer
  // -----------------------------------------------------------------------
  function renderPaymentRow(payment: any, index: number) {
    const overdue = isOverdue(payment.due_date, payment.status);
    const createdDate = payment.created_at
      ? format(parseISO(payment.created_at), 'MMM yyyy')
      : payment.paid_date
        ? format(parseISO(payment.paid_date), 'MMM yyyy')
        : payment.due_date
          ? format(parseISO(payment.due_date), 'MMM yyyy')
          : 'N/A';

    return (
      <motion.div
        key={payment.id}
        variants={staggerItem}
        initial="hidden"
        animate="visible"
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:shadow-sm transition-shadow"
      >
        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
          payment.status === 'COMPLETED'
            ? 'bg-emerald-100'
            : overdue
              ? 'bg-red-100'
              : 'bg-amber-100'
        }`}>
          {payment.status === 'COMPLETED' ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : overdue ? (
            <AlertTriangle className="size-4 text-red-600" />
          ) : (
            <Clock className="size-4 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{createdDate}</span>
            <Badge className={`text-[10px] px-1.5 py-0 ${getPaymentStatusColor(payment.status)}`}>
              {overdue ? 'Overdue' : getPaymentStatusLabel(payment.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatCurrency(payment.amount)}</span>
            {payment.method && <span>· {payment.method}</span>}
            {payment.paid_date && payment.status === 'COMPLETED' && (
              <span>· {format(parseISO(payment.paid_date), 'dd MMM')}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => handleShowReceipt(payment)}
        >
          <Download className="size-3.5 text-muted-foreground" />
        </Button>
      </motion.div>
    );
  }
}
