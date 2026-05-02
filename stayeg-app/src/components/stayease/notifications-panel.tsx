'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CreditCard,
  CheckCircle2,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  UserCheck,
  IndianRupee,
  Wifi,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { authFetch } from '@/lib/api-client';
import { useAppStore } from '@/store/use-app-store';

interface Notification {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

// formatTimeAgo helper: converts ISO date strings to relative time
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Just now';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

const TENANT_NOTIFICATIONS: Notification[] = [
  {
    id: 't1',
    icon: CreditCard,
    iconColor: 'text-amber-500',
    title: 'Rent due in 3 days',
    description: 'Your rent of ₹8,500 is due on July 1st. Pay now to avoid late fees.',
    time: '30m ago',
    read: false,
  },
  {
    id: 't2',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    title: 'Your complaint has been resolved',
    description: 'The WiFi issue you reported on June 25th has been fixed.',
    time: '2h ago',
    read: false,
  },
  {
    id: 't3',
    icon: MapPin,
    iconColor: 'text-brand-teal',
    title: 'New PG listing near you',
    description: 'Sunrise PG in Koramangala has 3 beds available starting ₹6,000/mo.',
    time: '5h ago',
    read: false,
  },
  {
    id: 't4',
    icon: IndianRupee,
    iconColor: 'text-emerald-500',
    title: 'Payment received - ₹8,500',
    description: 'Your rent payment for June 2025 has been processed successfully.',
    time: '1d ago',
    read: true,
  },
];

const OWNER_NOTIFICATIONS: Notification[] = [
  {
    id: 'o1',
    icon: CalendarCheck,
    iconColor: 'text-brand-teal',
    title: 'New booking request from Rahul',
    description: 'Rahul Sharma wants to book a shared room in Green Valley PG.',
    time: '15m ago',
    read: false,
  },
  {
    id: 'o2',
    icon: IndianRupee,
    iconColor: 'text-emerald-500',
    title: 'Rent payment received - ₹9,000',
    description: 'Priya Patel paid rent for Room 204, Sunrise PG for July 2025.',
    time: '1h ago',
    read: false,
  },
  {
    id: 'o3',
    icon: Wifi,
    iconColor: 'text-amber-500',
    title: 'Complaint raised: WiFi not working',
    description: 'Tenant Amit in Room 108 reported internet connectivity issues.',
    time: '3h ago',
    read: false,
  },
  {
    id: 'o4',
    icon: UserCheck,
    iconColor: 'text-brand-teal',
    title: 'New tenant verified',
    description: 'Sneha Gupta has completed KYC verification for Green Valley PG.',
    time: '6h ago',
    read: true,
  },
];

export default function NotificationsPanel() {
  const { currentRole, isLoggedIn, currentUser } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>(
    currentRole === 'OWNER' ? OWNER_NOTIFICATIONS : TENANT_NOTIFICATIONS
  );
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn || !currentUser?.id) return;

    setIsLoading(true);
    try {
      const [bookingsRes, paymentsRes, complaintsRes] = await Promise.allSettled([
        authFetch(`/api/bookings?userId=${currentUser.id}`).then((r) => (r.ok ? r.json() : [])),
        authFetch(`/api/payments?userId=${currentUser.id}`).then((r) => (r.ok ? r.json() : [])),
        authFetch(`/api/complaints?userId=${currentUser.id}`).then((r) => (r.ok ? r.json() : [])),
      ]);

      const bookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value as any[]) : [];
      const payments = paymentsRes.status === 'fulfilled' ? (paymentsRes.value as any[]) : [];
      const complaints = complaintsRes.status === 'fulfilled' ? (complaintsRes.value as any[]) : [];

      const dynamicNotifs: Notification[] = [];

      // Tenant notifications from bookings
      if (currentRole === 'TENANT') {
        bookings.forEach((booking: any) => {
          const statusLabel =
            booking.status === 'CONFIRMED'
              ? 'Confirmed'
              : booking.status === 'ACTIVE'
                ? 'Active'
                : booking.status === 'CANCELLED'
                  ? 'Cancelled'
                  : 'Pending';
          dynamicNotifs.push({
            id: `booking-${booking.id}`,
            icon: CalendarDays,
            iconColor: booking.status === 'CONFIRMED' || booking.status === 'ACTIVE' ? 'text-brand-teal' : 'text-amber-500',
            title: `Booking ${statusLabel}`,
            description: `Your booking at ${booking.pg?.name || 'PG'} is ${statusLabel.toLowerCase()}.`,
            time: formatTimeAgo(booking.created_at || booking.createdAt),
            read: false,
          });
        });

        // Tenant notifications from payments
        payments.forEach((payment: any) => {
          if (payment.status === 'FAILED') {
            dynamicNotifs.push({
              id: `payment-failed-${payment.id}`,
              icon: AlertTriangle,
              iconColor: 'text-red-500',
              title: `Payment Failed - ₹${payment.amount?.toLocaleString('en-IN') || '0'}`,
              description: `Your ${payment.type?.replace('_', ' ') || 'rent'} payment at ${payment.pg?.name || 'PG'} failed. Please retry.`,
              time: formatTimeAgo(payment.created_at || payment.paidDate || payment.createdAt),
              read: false,
            });
          } else if (payment.status === 'COMPLETED') {
            dynamicNotifs.push({
              id: `payment-completed-${payment.id}`,
              icon: IndianRupee,
              iconColor: 'text-emerald-500',
              title: `Payment Received - ₹${payment.amount?.toLocaleString('en-IN') || '0'}`,
              description: `Your ${payment.type?.replace('_', ' ') || 'rent'} payment for ${payment.pg?.name || 'PG'} has been processed.`,
              time: formatTimeAgo(payment.created_at || payment.paidDate || payment.createdAt),
              read: true,
            });
          } else if (payment.status === 'PENDING') {
            dynamicNotifs.push({
              id: `payment-pending-${payment.id}`,
              icon: CreditCard,
              iconColor: 'text-amber-500',
              title: `Payment Due - ₹${payment.amount?.toLocaleString('en-IN') || '0'}`,
              description: `${payment.type?.replace('_', ' ') || 'Rent'} payment${payment.dueDate ? ` due on ${new Date(payment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''} for ${payment.pg?.name || 'PG'}.`,
              time: formatTimeAgo(payment.created_at || payment.dueDate || payment.createdAt),
              read: false,
            });
          }
        });

        // Tenant notifications from complaints
        complaints.forEach((complaint: any) => {
          const catIcon = complaint.category === 'MAINTENANCE' || complaint.category === 'CLEANLINESS' ? CheckCircle2 : MessageSquare;
          const catColor =
            complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
              ? 'text-emerald-500'
              : complaint.status === 'IN_PROGRESS'
                ? 'text-amber-500'
                : 'text-red-500';
          const catTitle =
            complaint.status === 'RESOLVED'
              ? 'Resolved'
              : complaint.status === 'CLOSED'
                ? 'Closed'
                : complaint.status === 'IN_PROGRESS'
                  ? 'In Progress'
                  : 'New';
          dynamicNotifs.push({
            id: `complaint-${complaint.id}`,
            icon: catIcon,
            iconColor: catColor,
            title: `Complaint ${catTitle}: ${complaint.title || complaint.category}`,
            description: complaint.description
              ? complaint.description.slice(0, 80) + (complaint.description.length > 80 ? '...' : '')
              : `Your ${complaint.category?.toLowerCase() || ''} complaint has been updated.`,
            time: formatTimeAgo(complaint.createdAt || complaint.created_at),
            read: complaint.status === 'RESOLVED' || complaint.status === 'CLOSED',
          });
        });

        // Add welcome notification if user is new
        if (currentUser?.createdAt) {
          const daysSinceJoin = Math.floor(
            (Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceJoin < 7) {
            dynamicNotifs.push({
              id: 'welcome',
              icon: Bell,
              iconColor: 'text-brand-teal',
              title: 'Welcome to StayEg!',
              description: 'Explore PGs near you, manage bookings, and enjoy seamless payments.',
              time: 'Just now',
              read: true,
            });
          }
        }
      }

      // Owner notifications from bookings
      if (currentRole === 'OWNER') {
        bookings.forEach((booking: any) => {
          const statusLabel =
            booking.status === 'CONFIRMED'
              ? 'Confirmed'
              : booking.status === 'ACTIVE'
                ? 'Active'
                : booking.status === 'PENDING'
                  ? 'Pending Approval'
                  : booking.status === 'CANCELLED'
                    ? 'Cancelled'
                    : 'Updated';
          dynamicNotifs.push({
            id: `booking-${booking.id}`,
            icon: CalendarCheck,
            iconColor: booking.status === 'PENDING' ? 'text-amber-500' : 'text-brand-teal',
            title: `Booking ${statusLabel}`,
            description: `${booking.user?.name || 'A tenant'} booked a ${booking.bed?.room?.roomType?.toLowerCase() || ''} room in ${booking.pg?.name || 'PG'}.`,
            time: formatTimeAgo(booking.created_at || booking.createdAt),
            read: booking.status !== 'PENDING',
          });
        });

        // Owner notifications from payments
        payments.forEach((payment: any) => {
          if (payment.status === 'COMPLETED') {
            dynamicNotifs.push({
              id: `payment-received-${payment.id}`,
              icon: IndianRupee,
              iconColor: 'text-emerald-500',
              title: `Payment Received - ₹${payment.amount?.toLocaleString('en-IN') || '0'}`,
              description: `${payment.user?.name || 'Tenant'} paid for ${payment.pg?.name || 'PG'} (${payment.type?.replace('_', ' ') || 'rent'}).`,
              time: formatTimeAgo(payment.created_at || payment.paidDate || payment.createdAt),
              read: false,
            });
          }
        });

        // Owner notifications from complaints
        complaints.forEach((complaint: any) => {
          dynamicNotifs.push({
            id: `complaint-${complaint.id}`,
            icon: complaint.status === 'OPEN' ? AlertTriangle : MessageSquare,
            iconColor: complaint.status === 'OPEN' ? 'text-red-500' : 'text-amber-500',
            title: `Complaint: ${complaint.title || complaint.category}`,
            description: `${complaint.user?.name || 'Tenant'} reported an issue in ${complaint.pg?.name || 'PG'}.`,
            time: formatTimeAgo(complaint.createdAt || complaint.created_at),
            read: complaint.status === 'RESOLVED' || complaint.status === 'CLOSED',
          });
        });

        // Fetch analytics for owner
        const analyticsRes = await authFetch(`/api/analytics?ownerId=${currentUser.id}`).then((r) =>
          r.ok ? r.json() : null
        );
        if (analyticsRes) {
          dynamicNotifs.push({
            id: 'analytics',
            icon: TrendingUp,
            iconColor: 'text-brand-teal',
            title: `Occupancy: ${analyticsRes.occupancyRate || 0}%`,
            description: `${analyticsRes.activeBookings || 0} active bookings · ₹${(analyticsRes.monthlyRevenue || 0).toLocaleString('en-IN')} revenue this month.`,
            time: 'Updated just now',
            read: false,
          });
        }
      }

      // Sort by most recent first (unread first, then by position)
      dynamicNotifs.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return 0;
      });

      setNotifications(dynamicNotifs.length > 0 ? dynamicNotifs : (currentRole === 'OWNER' ? OWNER_NOTIFICATIONS : TENANT_NOTIFICATIONS));
    } catch {
      // Fallback to hardcoded notifications on error
      setNotifications(currentRole === 'OWNER' ? OWNER_NOTIFICATIONS : TENANT_NOTIFICATIONS);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, currentUser?.id, currentRole]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="size-5 text-muted-foreground" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5"
              >
                <Badge className="h-4 min-w-4 px-1 text-[10px] bg-brand-teal border-brand-teal text-white flex items-center justify-center">
                  {unreadCount}
                </Badge>
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-80 sm:w-96 p-0 bg-card border-border rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-brand-teal" />
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 px-1.5 text-[10px] bg-brand-teal/10 text-brand-teal border-0"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-teal hover:text-brand-teal/80 hover:bg-brand-teal/10 h-7 px-2"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <Separator />

        {/* Notification list */}
        <ScrollArea className="max-h-80 sm:max-h-96">
          <AnimatePresence initial={false}>
            {isLoading ? (
              <div className="divide-y divide-border/50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <Skeleton className="size-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 px-4"
              >
                <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bell className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notification) => {
                  const Icon = notification.icon;
                  return (
                    <motion.button
                      key={notification.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleMarkAsRead(notification.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted cursor-pointer ${
                        !notification.read
                          ? 'border-l-2 border-brand-teal bg-brand-teal/[0.02]'
                          : 'border-l-2 border-transparent'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0 ${
                          notification.read ? 'bg-muted' : 'bg-brand-teal/10'
                        }`}
                      >
                        <Icon
                          className={`size-4 ${
                            notification.read
                              ? 'text-muted-foreground'
                              : notification.iconColor
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              notification.read
                                ? 'text-muted-foreground font-normal'
                                : 'text-foreground font-medium'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="size-2 rounded-full bg-brand-teal shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="px-4 py-2.5">
          <Button
            variant="ghost"
            className="w-full text-sm text-brand-teal hover:text-brand-teal/80 hover:bg-brand-teal/10 h-8"
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
