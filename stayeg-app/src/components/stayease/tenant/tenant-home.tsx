'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, isAfter, isBefore, differenceInDays } from 'date-fns';
import {
  Sun, Moon, CloudSun, CreditCard, MessageSquare, Search,
  BookOpen, ChevronRight, IndianRupee, Clock, AlertTriangle,
  CheckCircle2, Building2, Star, MapPin, UtensilsCrossed,
  TrainFront, Hospital, Landmark, Pill, ShoppingBag, Sparkles,
  Gift, UsersRound, Trophy, Zap, ArrowRight, RefreshCcw,
  Home, CalendarDays, Bell, Wifi, HelpCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { AppView } from '@/lib/types';

// ---------------------------------------------------------------------------
// API response types (snake_case from Supabase)
// ---------------------------------------------------------------------------
interface ApiBooking {
  id: string;
  user_id: string;
  pg_id: string;
  bed_id: string;
  check_in_date: string;
  status: string;
  advance_paid: number;
  pg?: { id: string; name: string; address: string; city: string; images?: string[] };
  bed?: {
    id: string;
    bed_number: number;
    status: string;
    room?: { room_code: string; room_type: string; floor: number };
  };
  payments?: ApiPayment[];
}

interface ApiPayment {
  id: string;
  user_id: string;
  pg_id: string;
  booking_id?: string;
  amount: number;
  type: string;
  status: string;
  due_date?: string | null;
  paid_date?: string | null;
  method?: string | null;
  coupon_code?: string | null;
  discount?: number | null;
  pg?: { id: string; name: string };
}

interface ApiPG {
  id: string;
  name: string;
  address: string;
  city: string;
  gender: string;
  price: number;
  rating: number;
  total_reviews: number;
  images: string[];
  amenities: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getGreeting(): { text: string; icon: React.ElementType; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sun, emoji: '🌅' };
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun, emoji: '☀️' };
  return { text: 'Good evening', icon: Moon, emoji: '🌙' };
}

function getRentStatus(payment: ApiPayment): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (!payment.due_date) return { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };

  const due = new Date(payment.due_date);
  const now = new Date();
  const diff = differenceInDays(due, now);

  if (payment.status === 'COMPLETED') {
    return { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
  }
  if (diff < 0) {
    return { label: 'Overdue', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  }
  if (diff <= 3) {
    return { label: 'Due Soon', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
  }
  return { label: 'Pending', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
}

function getFirstName(name?: string): string {
  if (!name) return 'there';
  return name.split(' ')[0];
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const OFFERS = [
  {
    id: 'o1',
    title: 'Pay Early, Save More',
    description: 'Pay rent 5 days before due date & get 5% cashback',
    gradient: 'from-brand-deep to-brand-teal',
    icon: Zap,
    badge: 'Active',
    badgeColor: 'bg-white/20 text-white border-white/30',
    isComingSoon: false,
  },
  {
    id: 'o2',
    title: 'Refer & Earn ₹500',
    description: 'Invite friends to StayEg. Both of you get ₹500 off',
    gradient: 'from-green-600 to-emerald-500',
    icon: Gift,
    badge: 'New',
    badgeColor: 'bg-white/20 text-white border-white/30',
    isComingSoon: false,
  },
  {
    id: 'o3',
    title: 'Community',
    description: 'Connect with tenants, find roommates, join events',
    gradient: 'from-purple-500 to-indigo-500',
    icon: UsersRound,
    badge: 'Coming Soon',
    badgeColor: 'bg-white/25 text-white border-white/40',
    isComingSoon: true,
  },
  {
    id: 'o4',
    title: 'Games & Rewards',
    description: 'Play daily quizzes, earn StayEg coins & redeem rewards',
    gradient: 'from-amber-500 to-orange-500',
    icon: Trophy,
    badge: 'Coming Soon',
    badgeColor: 'bg-white/25 text-white border-white/40',
    isComingSoon: true,
  },
];

const NEARBY_ESSENTIALS = [
  { id: 'ne1', label: 'Food', icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-600' },
  { id: 'ne2', label: 'Transport', icon: TrainFront, color: 'bg-brand-teal/10 text-brand-teal' },
  { id: 'ne3', label: 'Hospital', icon: Hospital, color: 'bg-red-50 text-red-600' },
  { id: 'ne4', label: 'ATM', icon: Landmark, color: 'bg-blue-50 text-blue-600' },
  { id: 'ne5', label: 'Pharmacy', icon: Pill, color: 'bg-pink-50 text-pink-600' },
  { id: 'ne6', label: 'Shopping', icon: ShoppingBag, color: 'bg-purple-50 text-purple-600' },
];

const QUICK_ACTIONS = [
  { id: 'qa1', label: 'Search PGs', icon: Search, view: 'PG_LISTING' as AppView, color: 'bg-brand-teal/10 text-brand-teal', description: 'Find your next home' },
  { id: 'qa2', label: 'My Bookings', icon: BookOpen, view: 'MY_BOOKINGS' as AppView, color: 'bg-blue-50 text-blue-600', description: 'View booking status' },
  { id: 'qa3', label: 'Payments', icon: CreditCard, view: 'PAYMENTS' as AppView, color: 'bg-green-50 text-green-600', description: 'Track & pay rent' },
  { id: 'qa4', label: 'Complaints', icon: MessageSquare, view: 'COMPLAINTS' as AppView, color: 'bg-amber-50 text-amber-600', description: 'Raise an issue' },
  { id: 'qa5', label: 'User Guide', icon: HelpCircle, view: 'TENANT_GUIDE' as AppView, color: 'bg-purple-50 text-purple-600', description: 'How to use StayEg' },
];

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------
function HomeLoadingSkeleton() {
  return (
    <div className="px-4 py-5 space-y-6 max-w-5xl mx-auto">
      {/* Greeting skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <Separator />

      {/* Rent card skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Quick actions skeleton */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Offers skeleton */}
      <div>
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-64 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* PGs skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52 w-44 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function TenantHome() {
  const { currentUser, setCurrentView } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);
  const [pendingPayments, setPendingPayments] = useState<ApiPayment[]>([]);
  const [recommendedPGs, setRecommendedPGs] = useState<ApiPG[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  const userId = currentUser?.id;

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [bookingsRes, paymentsRes, pgsRes] = await Promise.allSettled([
        authFetch(`/api/bookings?userId=${userId}`),
        authFetch(`/api/payments?userId=${userId}&status=PENDING`),
        authFetch(`/api/pgs?sortBy=rating&city=${currentUser?.city || 'Bangalore'}`),
      ]);

      // Bookings
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
        const bookings: ApiBooking[] = await bookingsRes.value.json();
        const active = bookings.find((b) => b.status === 'ACTIVE');
        setActiveBooking(active || null);
      } else {
        console.error('Failed to fetch bookings');
      }

      // Pending payments
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        const payments: ApiPayment[] = await paymentsRes.value.json();
        setPendingPayments(payments);
      } else {
        console.error('Failed to fetch payments');
      }

      // Recommended PGs
      if (pgsRes.status === 'fulfilled' && pgsRes.value.ok) {
        const pgs: ApiPG[] = await pgsRes.value.json();
        setRecommendedPGs(pgs.slice(0, 5));
      } else {
        console.error('Failed to fetch PGs');
      }
    } catch (err) {
      console.error('Error loading tenant home data:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentUser?.city]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---
  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
  };

  const handlePayNow = async (payment: ApiPayment) => {
    setPayingId(payment.id);
    try {
      const res = await authFetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payment.id,
          status: 'COMPLETED',
          method: 'UPI',
        }),
      });

      if (!res.ok) throw new Error('Payment failed');

      toast.success('Rent payment successful!');
      setPendingPayments((prev) => prev.filter((p) => p.id !== payment.id));
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchData();
  };

  // --- Derived State ---
  const greeting = getGreeting();
  const firstName = getFirstName(currentUser?.name);
  const GreetingIcon = greeting.icon;
  const hasActiveBooking = !!activeBooking;
  const hasPendingPayments = pendingPayments.length > 0;
  const nextPayment = pendingPayments[0] || null;

  // --- Render ---
  if (isLoading) return <HomeLoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="size-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">Oops!</h2>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRetry} variant="outline" className="gap-2">
          <RefreshCcw className="size-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto px-4 py-5 space-y-6"
    >
      {/* ================================================================ */}
      {/* 1. GREETING BANNER                                               */}
      {/* ================================================================ */}
      <motion.section variants={staggerItem} aria-label="Greeting banner">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <GreetingIcon className="size-5 text-amber-500 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {greeting.text}, {firstName}!
              </h1>
            </div>

            {hasActiveBooking && activeBooking?.pg ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="size-3.5 shrink-0" />
                <span className="truncate">{activeBooking.pg.name}</span>
                {activeBooking.bed?.room && (
                  <>
                    <span className="text-border">·</span>
                    <span>Room {activeBooking.bed.room.room_code}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Find your perfect PG home today
              </p>
            )}
          </div>

          {/* Notification bell (decorative placeholder) */}
          <button
            className="relative size-10 rounded-xl bg-muted/80 flex items-center justify-center shrink-0 hover:bg-muted transition-colors"
            aria-label="Notifications"
            onClick={() => toast.info('Notifications coming soon!')}
          >
            <Bell className="size-5 text-muted-foreground" />
            {hasPendingPayments && (
              <span className="absolute -top-0.5 -right-0.5 size-3 bg-red-500 rounded-full border-2 border-background" />
            )}
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-3">
          {hasPendingPayments && nextPayment && (
            <Button
              size="sm"
              onClick={() => handleNavigate('PAYMENTS')}
              className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white shadow-sm gap-1.5 h-9 text-xs font-medium"
            >
              <IndianRupee className="size-3.5" />
              Pay Rent
              <Badge className="bg-white/20 text-white border-white/30 text-[10px] px-1 py-0 h-4 ml-0.5">
                ₹{nextPayment.amount.toLocaleString('en-IN')}
              </Badge>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleNavigate('COMPLAINTS')}
            className="gap-1.5 h-9 text-xs font-medium border-border hover:bg-muted"
          >
            <MessageSquare className="size-3.5" />
            Raise Issue
          </Button>
        </div>
      </motion.section>

      <Separator />

      {/* ================================================================ */}
      {/* 2. RENT STATUS CARD                                              */}
      {/* ================================================================ */}
      {hasActiveBooking && (
        <motion.section variants={staggerItem} aria-label="Rent status">
          {nextPayment ? (
            <RentCard
              payment={nextPayment}
              payingId={payingId}
              onPayNow={handlePayNow}
              onViewAll={() => handleNavigate('PAYMENTS')}
            />
          ) : (
            <AllPaidCard />
          )}
        </motion.section>
      )}

      {/* ================================================================ */}
      {/* 3. QUICK ACTIONS GRID                                            */}
      {/* ================================================================ */}
      <motion.section variants={staggerItem} aria-label="Quick actions">
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <motion.button
              key={action.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNavigate(action.view)}
              className="bg-card rounded-2xl border border-border p-4 text-left hover:shadow-gold-sm hover:border-gold/30 transition-all group"
            >
              <div className={`size-10 rounded-xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <action.icon className="size-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">{action.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{action.description}</div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* 4. OFFERS & DEALS                                                */}
      {/* ================================================================ */}
      <motion.section variants={staggerItem} aria-label="Offers and deals">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Offers & Deals</h2>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="size-3" />
            New
          </Badge>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
          {OFFERS.map((offer) => (
            <motion.div
              key={offer.id}
              whileHover={{ y: -2 }}
              className={`shrink-0 w-72 sm:w-80 rounded-2xl bg-gradient-to-br ${offer.gradient} p-5 text-white relative overflow-hidden snap-start cursor-pointer ${offer.isComingSoon ? 'opacity-85' : ''}`}
              onClick={() => {
                if (offer.isComingSoon) {
                  toast.info(`${offer.title} feature is coming soon!`);
                } else {
                  toast.info('Offer details coming soon!');
                }
              }}
            >
              {/* Background decoration */}
              <div className="absolute -right-4 -top-4 opacity-10">
                <offer.icon className="size-28" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <offer.icon className="size-5" />
                  </div>
                  <Badge className={offer.badgeColor}>{offer.badge}</Badge>
                </div>
                <h3 className="font-bold text-base mb-1">{offer.title}</h3>
                <p className="text-white/80 text-xs leading-relaxed">{offer.description}</p>
                {offer.isComingSoon && (
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-white/60">
                    <Clock className="size-3" />
                    Under development
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* 5. RECOMMENDED PGs                                               */}
      {/* ================================================================ */}
      <motion.section variants={staggerItem} aria-label="Recommended PGs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            {hasActiveBooking ? 'Recommended PGs for Friends' : 'Popular PGs Near You'}
          </h2>
          <button
            onClick={() => handleNavigate('PG_LISTING')}
            className="text-xs font-medium text-brand-teal hover:text-brand-deep flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {recommendedPGs.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
            {recommendedPGs.map((pg, index) => (
              <PGScrollCard
                key={pg.id}
                pg={pg}
                index={index}
                onClick={() => {
                  useAppStore.getState().setSelectedPG(pg as any);
                  handleNavigate('PG_DETAIL');
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Building2 className="size-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No PGs available right now. Check back later!</p>
            </CardContent>
          </Card>
        )}
      </motion.section>

      {/* ================================================================ */}
      {/* 6. NEARBY ESSENTIALS                                            */}
      {/* ================================================================ */}
      <motion.section variants={staggerItem} aria-label="Nearby essentials">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Nearby Essentials</h2>
          <button
            onClick={() => handleNavigate('NEARBY')}
            className="text-xs font-medium text-brand-teal hover:text-brand-deep flex items-center gap-1 transition-colors"
          >
            See All
            <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
          {NEARBY_ESSENTIALS.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                toast.info(`${item.label} feature is coming soon!`);
                handleNavigate('NEARBY');
              }}
              className="shrink-0 snap-start bg-card rounded-2xl border border-border p-4 flex flex-col items-center gap-2.5 w-[100px] hover:shadow-gold-sm hover:border-gold/30 transition-all group"
            >
              <div className={`size-12 rounded-xl ${item.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <item.icon className="size-6" />
              </div>
              <div className="text-xs font-medium text-foreground text-center">{item.label}</div>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                Soon
              </Badge>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* 7. EMPTY STATE (no active booking)                               */}
      {/* ================================================================ */}
      {!hasActiveBooking && (
        <motion.section variants={staggerItem} aria-label="Welcome card">
          <div className="rounded-2xl bg-gradient-to-br from-brand-deep via-brand-teal to-brand-deep p-6 sm:p-8 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute right-0 bottom-0 opacity-[0.07]">
              <Home className="size-48" />
            </div>
            <div className="absolute right-8 top-4 opacity-[0.05]">
              <Wifi className="size-32" />
            </div>

            <div className="relative z-10 max-w-md">
              <div className="size-12 bg-white/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Sparkles className="size-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                Welcome to StayEg, {firstName}!
              </h3>
              <p className="text-white/80 text-sm leading-relaxed mb-5">
                {currentUser?.city
                  ? `Discover verified PGs in ${currentUser.city} with real photos, zero brokerage, and instant booking. Your perfect home is just a search away.`
                  : 'Discover verified PGs across 10+ cities with real photos, zero brokerage, and instant booking. Your perfect home is just a search away.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleNavigate('PG_LISTING')}
                  className="bg-white text-brand-deep hover:bg-white/90 font-semibold shadow-sm gap-2"
                >
                  <Search className="size-4" />
                  Find Your PG
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  onClick={() => handleNavigate('HOW_IT_WORKS')}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent gap-2"
                >
                  How It Works
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 mt-5">
                {[
                  { icon: CheckCircle2, label: 'Verified PGs' },
                  { icon: Star, label: 'Real Reviews' },
                  { icon: CreditCard, label: 'No Brokerage' },
                ].map((badge) => (
                  <div key={badge.label} className="flex items-center gap-1.5 text-white/70 text-xs">
                    <badge.icon className="size-3.5" />
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Bottom spacing for mobile nav */}
      <div className="h-4" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Rent Card — shown when there's a pending payment
// ---------------------------------------------------------------------------
function RentCard({
  payment,
  payingId,
  onPayNow,
  onViewAll,
}: {
  payment: ApiPayment;
  payingId: string | null;
  onPayNow: (p: ApiPayment) => void;
  onViewAll: () => void;
}) {
  const status = getRentStatus(payment);
  const isPaying = payingId === payment.id;
  const daysLeft = payment.due_date ? differenceInDays(new Date(payment.due_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;

  return (
    <Card className={`rounded-2xl border ${status.borderColor} ${status.bgColor}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Status row */}
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-lg ${status.bgColor} flex items-center justify-center`}>
                {isOverdue ? (
                  <AlertTriangle className="size-4 text-red-500" />
                ) : (
                  <Clock className="size-4 text-amber-500" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {payment.pg?.name || 'Rent Payment'}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color} ${status.borderColor}`}>
                    {status.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {payment.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount & due date */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  ₹{payment.amount.toLocaleString('en-IN')}
                </div>
                {payment.due_date && (
                  <div className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {isOverdue
                      ? `Overdue by ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) > 1 ? 's' : ''}`
                      : daysLeft === 0
                        ? 'Due today'
                        : `Due ${format(new Date(payment.due_date), 'dd MMM yyyy')} · ${daysLeft} day${daysLeft! > 1 ? 's' : ''} left`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            size="sm"
            onClick={() => onPayNow(payment)}
            disabled={isPaying}
            className={`font-semibold gap-1.5 shadow-sm ${
              isOverdue
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white'
            }`}
          >
            {isPaying ? (
              <>
                <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <IndianRupee className="size-3.5" />
                Pay Now
              </>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onViewAll} className="text-xs text-muted-foreground hover:text-foreground gap-1">
            View All
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// All Paid Card — shown when no pending payments
// ---------------------------------------------------------------------------
function AllPaidCard() {
  return (
    <Card className="rounded-2xl border border-green-200 bg-green-50">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="size-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">All caught up!</div>
            <div className="text-xs text-muted-foreground">No pending rent payments. You&apos;re on track.</div>
          </div>
          <CalendarDays className="size-5 text-green-300" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PG Scroll Card — compact horizontal PG card
// ---------------------------------------------------------------------------
function PGScrollCard({
  pg,
  index,
  onClick,
}: {
  pg: ApiPG;
  index: number;
  onClick: () => void;
}) {
  const coverImage = pg.images?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=300&fit=crop';
  const genderColors: Record<string, string> = {
    MALE: 'bg-blue-50 text-blue-600',
    FEMALE: 'bg-pink-50 text-pink-600',
    UNISEX: 'bg-purple-50 text-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="shrink-0 snap-start w-44 sm:w-48 bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:shadow-gold-sm hover:border-gold/30 transition-all group"
    >
      {/* Image */}
      <div className="relative h-28 overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={pg.name}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Gender badge */}
        <Badge
          className={`absolute top-2 left-2 text-[9px] px-1.5 py-0 h-4 font-medium ${genderColors[pg.gender] || 'bg-gray-50 text-gray-600'} border-0`}
        >
          {pg.gender}
        </Badge>
        {/* Rating */}
        {pg.rating > 0 && (
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-0.5">
            <Star className="size-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-semibold text-foreground">{pg.rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="text-xs font-semibold text-foreground truncate mb-1">{pg.name}</h4>
        <div className="flex items-center gap-1 text-muted-foreground mb-2">
          <MapPin className="size-3 shrink-0" />
          <span className="text-[11px] truncate">{pg.city}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">
            ₹{pg.price.toLocaleString('en-IN')}
            <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-brand-teal transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}
