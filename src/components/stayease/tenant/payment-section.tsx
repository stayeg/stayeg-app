'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isAfter, differenceInDays } from 'date-fns';
import {
  IndianRupee,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCcw,
  ArrowUpRight,
  Download,
  Tag,
  Copy,
  Plus,
  Gift,
  TrendingUp,
  CalendarCheck,
  Zap,
  Ticket,
  X,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { STATUSES, AVAILABLE_COUPONS, BADGE } from '@/lib/constants';
import type { Payment, PaymentMethod } from '@/lib/types';

const PAYMENT_METHOD_ICONS: Record<string, React.ElementType> = {
  UPI: Smartphone,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  NET_BANKING: Landmark,
  WALLET: Wallet,
  COUPON: Tag,
  CASH: Wallet,
  CARD: CreditCard,
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  UPI: 'UPI',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  CARD: 'Card',
  NET_BANKING: 'Net Banking',
  WALLET: 'Wallet',
  CASH: 'Cash',
  COUPON: 'Coupon',
};

const BANKS = [
  'SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra',
  'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank',
];

// Mock saved payment methods
const SAVED_PAYMENT_METHODS = [
  { id: 'pm1', type: 'CREDIT_CARD' as PaymentMethod, label: 'Visa ending 4242', icon: 'visa' },
  { id: 'pm2', type: 'UPI' as PaymentMethod, label: 'rajesh@okicici', icon: 'upi' },
  { id: 'pm3', type: 'DEBIT_CARD' as PaymentMethod, label: 'MasterCard ending 8888', icon: 'mastercard' },
];

export default function PaymentSection() {
  const { currentUser, appliedCoupon, setAppliedCoupon, showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string>('UPI');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [couponFilter, setCouponFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState<string | null>(null);
  const [payCouponCode, setPayCouponCode] = useState('');
  const [payCouponError, setPayCouponError] = useState('');
  const [payCouponDiscount, setPayCouponDiscount] = useState(0);
  const [newCardDetails, setNewCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [newUpiId, setNewUpiId] = useState('');

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['payments', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const res = await authFetch(`/api/payments?userId=${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    enabled: !!currentUser?.id,
  });

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = format(now, 'yyyy-MM');
    const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = payments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);
    const thisMonthPaid = completedPayments
      .filter((p) => p.paidDate && format(new Date(p.paidDate), 'yyyy-MM') === thisMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    return { totalPaid, totalPending, thisMonthPaid };
  }, [payments]);

  // Separate payments
  const pastPayments = useMemo(
    () => payments.filter((p) => p.status === 'COMPLETED' || p.status === 'REFUNDED'),
    [payments]
  );
  const upcomingPayments = useMemo(
    () => payments.filter((p) => p.status === 'PENDING' || p.status === 'FAILED'),
    [payments]
  );

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    const now = new Date();
    return AVAILABLE_COUPONS.filter((c) => {
      if (couponFilter === 'ACTIVE') return isAfter(new Date(c.validTill), now);
      if (couponFilter === 'EXPIRED') return !isAfter(new Date(c.validTill), now);
      return true;
    });
  }, [couponFilter]);

  const handlePayNow = async (payment: Payment) => {
    setPayingId(payment.id);
    try {
      const res = await authFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          pgId: payment.pgId,
          bookingId: payment.bookingId,
          amount: payment.amount,
          type: payment.type,
          method: selectedMethod,
        }),
      });
      if (!res.ok) throw new Error('Payment failed');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showToast('Payment successful!');
    } catch {
      showToast('Payment failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  const handleDialogPay = (paymentId: string) => {
    setPayingId(paymentId);
    setShowPayDialog(null);
    setPayCouponCode('');
    setPayCouponDiscount(0);
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    setTimeout(() => handlePayNow(payment), 300);
  };

  const handleApplyPayCoupon = () => {
    setPayCouponError('');
    if (!payCouponCode.trim()) {
      setPayCouponError('Enter a coupon code');
      return;
    }
    const coupon = AVAILABLE_COUPONS.find(
      (c) => c.code.toUpperCase() === payCouponCode.trim().toUpperCase()
    );
    if (!coupon) {
      setPayCouponError('Invalid coupon');
      return;
    }
    const payment = payments.find((p) => p.id === showPayDialog);
    if (!payment) return;
    if (payment.amount < coupon.minAmount) {
      setPayCouponError(`Min amount ₹${coupon.minAmount.toLocaleString('en-IN')} required`);
      return;
    }
    let disc = coupon.discountPercent
      ? Math.round((payment.amount * coupon.discountPercent) / 100)
      : (coupon as { flatDiscount?: number }).flatDiscount || 0;
    disc = Math.min(disc, coupon.maxDiscount);
    setPayCouponDiscount(disc);
    showToast(`Coupon applied! Save ₹${disc.toLocaleString('en-IN')}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="size-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="size-5 text-amber-500" />;
      case 'FAILED':
        return <AlertCircle className="size-5 text-red-500" />;
      case 'REFUNDED':
        return <RefreshCcw className="size-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleDownloadReceipt = (payment: Payment) => {
    const receipt = `
╔══════════════════════════════════════╗
║         STAYEG PAYMENT RECEIPT       ║
╠══════════════════════════════════════╣
║ Receipt No: PAY-${payment.id?.slice(0, 8).toUpperCase()}
║ Date: ${payment.paidDate || new Date().toISOString()}
║ Status: ${payment.status}
║                                      ║
║ Amount: ₹${payment.amount?.toLocaleString('en-IN')}
║ Type: ${payment.type}
║ Method: ${payment.method || 'Online'}
║${payment.couponCode ? `║ Coupon: ${payment.couponCode} (-₹${payment.discount || 0})` : ''}
║${payment.pg ? `║ PG: ${payment.pg.name}` : ''}
╚══════════════════════════════════════╝
  `.trim();
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StayEg_Receipt_${payment.id?.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Receipt downloaded!');
  };

  const handleRetryPayment = async (payment: Payment) => {
    setPayingId(payment.id);
    try {
      const res = await authFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          pgId: payment.pgId,
          bookingId: payment.bookingId,
          amount: payment.amount,
          type: payment.type,
          status: 'PENDING',
        }),
      });
      if (!res.ok) throw new Error('Retry failed');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showToast('Payment retry initiated successfully!');
    } catch {
      showToast('Payment retry failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  const handleAddPaymentMethod = () => {
    showToast('Payment method saved successfully');
    setShowAddMethod(false);
    setNewCardDetails({ number: '', name: '', expiry: '', cvv: '' });
    setNewUpiId('');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-muted/50"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 bg-gradient-to-br from-brand-deep to-brand-teal rounded-xl flex items-center justify-center">
              <CreditCard className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payments</h1>
              <p className="text-sm text-muted-foreground">Track and manage your rent payments</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Offer Banner */}
        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-r from-brand-deep via-brand-teal to-brand-deep rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Gift className="size-40 -mt-4 -mr-4" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Zap className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Pay via StayEg & Get 10% Cashback!</h3>
                  <p className="text-white/80 text-sm mt-0.5">
                    On your first 3 rent payments made through StayEg platform
                  </p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 shrink-0">
                Limited Offer
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Payment Stats */}
        {isLoading ? (
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-muted rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-20 bg-muted rounded" />
                      <div className="h-6 w-28 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-brand-lime/15 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-brand-lime" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className="text-xl font-bold text-foreground">
                    ₹{stats.totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-brand-sage/10 rounded-xl flex items-center justify-center">
                  <Clock className="size-5 text-brand-sage" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                  <div className="text-xl font-bold text-foreground">
                    ₹{stats.totalPending.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-brand-teal/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="size-5 text-brand-teal" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                  <div className="text-xl font-bold text-foreground">
                    ₹{stats.thisMonthPaid.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        )}

        {/* Main Content Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="bg-card border shadow-sm w-full justify-start rounded-xl p-1 h-auto gap-1">
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-brand-teal/100 data-[state=active]:text-white rounded-lg px-4 py-2.5 text-sm"
              >
                <ArrowUpRight className="size-4 mr-2" />
                Payment History
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="data-[state=active]:bg-brand-teal/100 data-[state=active]:text-white rounded-lg px-4 py-2.5 text-sm"
              >
                <CalendarCheck className="size-4 mr-2" />
                Upcoming
                {upcomingPayments.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0 h-4">
                    {upcomingPayments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="coupons"
                className="data-[state=active]:bg-brand-teal/100 data-[state=active]:text-white rounded-lg px-4 py-2.5 text-sm"
              >
                <Ticket className="size-4 mr-2" />
                Coupon Wallet
              </TabsTrigger>
              <TabsTrigger
                value="methods"
                className="data-[state=active]:bg-brand-teal/100 data-[state=active]:text-white rounded-lg px-4 py-2.5 text-sm"
              >
                <CreditCard className="size-4 mr-2" />
                Payment Methods
              </TabsTrigger>
            </TabsList>

            {/* Payment History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowUpRight className="size-5 text-brand-teal" />
                    Payment History
                  </CardTitle>
                  <CardDescription>All your completed and refunded transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 animate-pulse px-2 py-3">
                          <div className="h-4 w-28 bg-muted rounded" />
                          <div className="h-4 w-16 bg-muted rounded" />
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="flex-1" />
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-5 w-16 bg-muted rounded-full" />
                          <div className="h-7 w-20 bg-muted rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : pastPayments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="size-16 rounded-full bg-brand-teal/10 flex items-center justify-center mb-4">
                        <CreditCard className="size-8 text-brand-teal" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No payments yet</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">Your payment history will appear here once you make a booking.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-hidden rounded-xl border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/80">
                              <TableHead className="text-xs font-semibold">PG Name</TableHead>
                              <TableHead className="text-xs font-semibold">Type</TableHead>
                              <TableHead className="text-xs font-semibold">Method</TableHead>
                              <TableHead className="text-xs font-semibold">Date</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Receipt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pastPayments.map((payment, index) => {
                              const statusConfig = STATUSES.PAYMENT[payment.status as keyof typeof STATUSES.PAYMENT];
                              const MethodIcon = PAYMENT_METHOD_ICONS[payment.method || ''] || CreditCard;
                              return (
                                <motion.tr
                                  key={payment.id}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  className="hover:bg-muted/50 transition-colors"
                                >
                                  <TableCell className="text-sm font-medium">{payment.pg?.name || 'PG Payment'}</TableCell>
                                  <TableCell className="text-sm capitalize text-muted-foreground">{payment.type.replace('_', ' ')}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <MethodIcon className="size-3.5" />
                                      {PAYMENT_METHOD_LABELS[payment.method || ''] || payment.method || 'N/A'}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {payment.paidDate
                                      ? format(new Date(payment.paidDate), 'dd MMM yyyy')
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-right">
                                    ₹{Math.round(payment.amount).toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className={`text-xs ${statusConfig?.color || ''}`}>
                                      {statusConfig?.label || payment.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadReceipt(payment)}
                                      className="h-7 text-xs text-muted-foreground hover:text-brand-teal"
                                    >
                                      <Download className="size-3 mr-1" />
                                      Download
                                    </Button>
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="md:hidden space-y-3">
                        {pastPayments.map((payment, index) => {
                          const statusConfig = STATUSES.PAYMENT[payment.status as keyof typeof STATUSES.PAYMENT];
                          const MethodIcon = PAYMENT_METHOD_ICONS[payment.method || ''] || CreditCard;
                          return (
                            <motion.div
                              key={payment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-muted/80 rounded-xl p-4 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(payment.status)}
                                  <span className="font-medium text-sm text-foreground">
                                    {payment.pg?.name || 'PG Payment'}
                                  </span>
                                </div>
                                <Badge variant="outline" className={`text-xs ${statusConfig?.color || ''}`}>
                                  {statusConfig?.label || payment.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="capitalize">{payment.type.replace('_', ' ')}</span>
                                  <span className="flex items-center gap-1">
                                    <MethodIcon className="size-3" />
                                    {PAYMENT_METHOD_LABELS[payment.method || ''] || payment.method}
                                  </span>
                                  {payment.paidDate && (
                                    <span>{format(new Date(payment.paidDate), 'dd MMM yyyy')}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    ₹{Math.round(payment.amount).toLocaleString('en-IN')}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadReceipt(payment)}
                                    className="h-6 w-6 p-0 text-muted-foreground"
                                  >
                                    <Download className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Upcoming Payments Tab */}
            <TabsContent value="upcoming" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarCheck className="size-5 text-brand-teal" />
                    Upcoming Payments
                  </CardTitle>
                  <CardDescription>Due payments that need your attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="size-16 bg-brand-lime/15 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="size-8 text-brand-lime" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
                      <p className="text-muted-foreground text-sm">No pending payments at the moment.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingPayments.map((payment, index) => {
                        const statusConfig = STATUSES.PAYMENT[payment.status as keyof typeof STATUSES.PAYMENT];
                        const MethodIcon = PAYMENT_METHOD_ICONS[payment.method || ''] || CreditCard;
                        const isOverdue = payment.dueDate && isAfter(new Date(), new Date(payment.dueDate));
                        const diffDays = payment.dueDate ? differenceInDays(new Date(payment.dueDate), new Date()) : Infinity;
                        const isDueSoon = diffDays >= 0 && diffDays <= 3;

                        return (
                          <motion.div
                            key={payment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-brand-teal/10 border border-brand-teal/15 rounded-xl p-4 hover:bg-brand-teal/10 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(payment.status)}
                                <div>
                                  <span className="font-medium text-sm text-foreground">
                                    {payment.pg?.name || 'PG Payment'}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {payment.type.replace('_', ' ')}
                                    </span>
                                    <Badge variant="outline" className={`text-xs ${statusConfig?.color || ''}`}>
                                      {statusConfig?.label || payment.status}
                                    </Badge>
                                    {payment.couponCode && (
                                      <Badge className={`text-xs ${BADGE.green}`}>
                                        <Tag className="size-3 mr-1" />
                                        {payment.couponCode}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-foreground">
                                  ₹{Math.round(payment.amount).toLocaleString('en-IN')}
                                </div>
                                {payment.dueDate && (
                                  <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : isDueSoon ? 'text-brand-sage font-medium' : 'text-muted-foreground'}`}>
                                    {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Due'}: {format(new Date(payment.dueDate), 'dd MMM yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Coupon input for payment */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="relative flex-1">
                                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                <Input
                                  placeholder="Apply coupon for discount"
                                  value={payCouponCode}
                                  onChange={(e) => {
                                    setPayCouponCode(e.target.value);
                                    setPayCouponError('');
                                  }}
                                  className="pl-8 h-8 text-xs"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleApplyPayCoupon}
                                className="h-8 text-xs border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"
                              >
                                Apply
                              </Button>
                            </div>
                            {payCouponError && (
                              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                {payCouponError}
                              </p>
                            )}
                            {payCouponDiscount > 0 && (
                              <div className="flex items-center gap-1.5 mb-3 text-xs text-brand-lime">
                                <CheckCircle2 className="size-3.5" />
                                Coupon applied! You save ₹{payCouponDiscount.toLocaleString('en-IN')}
                              </div>
                            )}

                            {/* Payment method quick select */}
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              <span className="text-xs text-muted-foreground">Pay with:</span>
                              {['UPI', 'CREDIT_CARD', 'NET_BANKING', 'WALLET'].map((m) => {
                                const Icon = PAYMENT_METHOD_ICONS[m] || CreditCard;
                                return (
                                  <button
                                    key={m}
                                    onClick={() => setSelectedMethod(m)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                                      selectedMethod === m
                                        ? 'border-brand-teal/50 bg-brand-teal/10 text-brand-teal'
                                        : 'border-border text-muted-foreground hover:border-brand-teal/20'
                                    }`}
                                  >
                                    <Icon className="size-3" />
                                    {PAYMENT_METHOD_LABELS[m]}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setShowPayDialog(payment.id)}
                                disabled={payingId === payment.id}
                                className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                              >
                                {payingId === payment.id ? (
                                  <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                                ) : (
                                  <IndianRupee className="size-3.5 mr-1" />
                                )}
                                Pay Now
                              </Button>
                              {payment.status === 'FAILED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryPayment(payment)}
                                  disabled={payingId === payment.id}
                                  className="text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
                                >
                                  <RefreshCcw className="size-3.5 mr-1" />
                                  Retry
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Coupon Wallet Tab */}
            <TabsContent value="coupons" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Ticket className="size-5 text-brand-teal" />
                        Coupon Wallet
                      </CardTitle>
                      <CardDescription>Available coupons and offers for you</CardDescription>
                    </div>
                    <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                      {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setCouponFilter(f)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            couponFilter === f
                              ? 'bg-card text-brand-teal shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Expired'}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredCoupons.map((coupon, index) => {
                      const isActive = isAfter(new Date(coupon.validTill), new Date());
                      const isApplied = appliedCoupon === coupon.code;

                      return (
                        <motion.div
                          key={coupon.code}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`relative rounded-xl border overflow-hidden ${
                            isApplied
                              ? 'border-brand-lime/30 bg-brand-lime/15'
                              : isActive
                              ? 'border-brand-teal/20 bg-card'
                              : 'border-border bg-muted opacity-60'
                          }`}
                        >
                          <div className="flex">
                            {/* Coupon Left - Discount Display */}
                            <div className={`w-28 shrink-0 flex flex-col items-center justify-center p-3 ${
                              isActive
                                ? 'bg-gradient-to-br from-brand-deep to-brand-teal text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <div className="text-2xl font-bold">
                                {coupon.discountPercent > 0
                                  ? `${coupon.discountPercent}%`
                                  : `₹${(coupon as { flatDiscount?: number }).flatDiscount || 0}`}
                              </div>
                              <div className="text-[10px] uppercase tracking-wide opacity-80">OFF</div>
                            </div>

                            {/* Coupon Right - Details */}
                            <div className="flex-1 p-3 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-foreground">
                                      {coupon.code}
                                    </span>
                                    {isApplied && (
                                      <Badge className={`text-[10px] ${BADGE.green} px-1.5`}>
                                        Applied
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {coupon.description}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleCopyCode(coupon.code)}
                                  disabled={!isActive}
                                  className="shrink-0 size-7 rounded-lg bg-muted hover:bg-brand-teal/15 flex items-center justify-center transition-colors disabled:opacity-50"
                                >
                                  {copiedCode === coupon.code ? (
                                    <CheckCircle2 className="size-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="size-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              </div>

                              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarCheck className="size-3" />
                                  Valid till {format(new Date(coupon.validTill), 'dd MMM yyyy')}
                                </span>
                                <span>
                                  Min: ₹{coupon.minAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Tag className="size-3" />
                                  {coupon.applicableFor.join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dotted separator */}
                          <div className="absolute left-28 top-0 bottom-0 w-px border-l border-dashed border-border hidden sm:block" />
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Methods Tab */}
            <TabsContent value="methods" className="mt-4 space-y-4">
              {/* Saved Methods */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="size-5 text-brand-teal" />
                        Saved Payment Methods
                      </CardTitle>
                      <CardDescription>Your saved payment options for quick checkout</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddMethod(true)}
                      className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                    >
                      <Plus className="size-4 mr-1" />
                      Add New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {SAVED_PAYMENT_METHODS.map((method, index) => {
                      const Icon = PAYMENT_METHOD_ICONS[method.type] || CreditCard;
                      return (
                        <motion.div
                          key={method.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-4 p-3.5 bg-muted/80 rounded-xl hover:bg-muted transition-colors group"
                        >
                          <div className="size-10 bg-card rounded-xl border border-border flex items-center justify-center shadow-sm group-hover:border-brand-teal/20 transition-colors">
                            <Icon className="size-5 text-muted-foreground group-hover:text-brand-teal transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{method.label}</div>
                            <div className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[method.type]}</div>
                          </div>
                          <Badge variant="outline" className="text-xs text-brand-lime border-brand-lime/20 bg-brand-lime/15">
                            Default
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Remove
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Pay Methods */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Zap className="size-4 text-brand-teal" />
                    Quick Pay Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => {
                      if (key === 'COUPON') return null;
                      const Icon = PAYMENT_METHOD_ICONS[key] || CreditCard;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedMethod(key)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            selectedMethod === key
                              ? 'border-brand-teal/50 bg-brand-teal/10 text-brand-teal'
                              : 'border-border bg-card text-muted-foreground hover:border-brand-teal/20 hover:bg-brand-teal/10'
                          }`}
                        >
                          <Icon className="size-6" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Payment Method Selection Card (below tabs) */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wallet className="size-4 text-brand-teal" />
                Preferred Payment Method for Auto-Pay
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => {
                  const Icon = PAYMENT_METHOD_ICONS[key] || CreditCard;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMethod(key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                        selectedMethod === key
                          ? 'border-brand-teal/50 bg-brand-teal/10 text-brand-teal'
                          : 'border-border bg-card text-muted-foreground hover:border-brand-teal/20 hover:bg-brand-teal/10'
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddMethod} onOpenChange={setShowAddMethod}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>Add a new payment method for quick checkout</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="card" className="w-full mt-2">
            <TabsList className="w-full h-auto p-1 grid grid-cols-3">
              <TabsTrigger value="card" className="text-xs py-2">Card</TabsTrigger>
              <TabsTrigger value="upi" className="text-xs py-2">UPI</TabsTrigger>
              <TabsTrigger value="netbanking" className="text-xs py-2">Net Banking</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-xs">Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={newCardDetails.number}
                  onChange={(e) => setNewCardDetails((p) => ({ ...p, number: e.target.value }))}
                  maxLength={19}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Name on Card</Label>
                <Input
                  placeholder="Enter name"
                  value={newCardDetails.name}
                  onChange={(e) => setNewCardDetails((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Expiry</Label>
                  <Input
                    placeholder="MM/YY"
                    value={newCardDetails.expiry}
                    onChange={(e) => setNewCardDetails((p) => ({ ...p, expiry: e.target.value }))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CVV</Label>
                  <Input
                    placeholder="123"
                    value={newCardDetails.cvv}
                    onChange={(e) => setNewCardDetails((p) => ({ ...p, cvv: e.target.value }))}
                    maxLength={4}
                    type="password"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upi" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-xs">UPI ID</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="yourname@upi"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="netbanking" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-xs">Select Bank</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowAddMethod(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAddPaymentMethod}
              className="flex-1 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
            >
              Save Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Confirmation Dialog */}
      <Dialog open={!!showPayDialog} onOpenChange={() => setShowPayDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>Review and confirm your payment</DialogDescription>
          </DialogHeader>
          {showPayDialog && (() => {
            const payment = payments.find((p) => p.id === showPayDialog);
            if (!payment) return null;
            const MethodIcon = PAYMENT_METHOD_ICONS[selectedMethod] || CreditCard;
            return (
              <div className="space-y-4 mt-2">
                <div className="bg-brand-teal/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">PG</span>
                    <span className="text-sm font-medium">{payment.pg?.name || 'PG Payment'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm capitalize">{payment.type.replace('_', ' ')}</span>
                  </div>
                  {payment.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Due Date</span>
                      <span className="text-sm">{format(new Date(payment.dueDate), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  <Separator className="bg-brand-teal/20/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Amount</span>
                    <span className="text-lg font-bold text-brand-teal">
                      ₹{Math.round(payment.amount - payCouponDiscount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {payCouponDiscount > 0 && (
                    <div className="text-xs text-brand-lime">
                      Coupon discount: -₹{payCouponDiscount.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <MethodIcon className="size-5 text-brand-teal" />
                  <div>
                    <div className="text-sm font-medium">Paying via {PAYMENT_METHOD_LABELS[selectedMethod]}</div>
                    <div className="text-xs text-muted-foreground">Secure payment powered by StayEg</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowPayDialog(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleDialogPay(payment.id)}
                    disabled={payingId === payment.id}
                    className="flex-1 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                  >
                    {payingId === payment.id ? (
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <IndianRupee className="size-4 mr-1" />
                        Pay ₹{Math.round(payment.amount - payCouponDiscount).toLocaleString('en-IN')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
