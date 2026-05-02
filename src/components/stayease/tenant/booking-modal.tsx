'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CalendarDays,
  User,
  Mail,
  Phone,
  BedDouble,
  AlertCircle,
  Shield,
  Camera,
  X,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Tag,
  ChevronRight,
  ChevronLeft,
  ImageIcon,
  Clock,
  Copy,
  CheckCircle2,
  Ticket,
  LogIn,
  Sparkles,
  Zap,
  IndianRupee,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { AVAILABLE_COUPONS, BADGE } from '@/lib/constants';
import type { PaymentMethod } from '@/lib/types';

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ['Room Images', 'Personal Details', 'Review & Pay'] as const;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
  { value: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'NET_BANKING', label: 'Net Banking', icon: Landmark },
  { value: 'WALLET', label: 'Wallet', icon: Wallet },
];

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const BANKS = [
  'SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra',
  'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'IndusInd Bank',
];

const WALLET_OPTIONS = ['Paytm', 'PhonePe', 'Amazon Pay', 'Freecharge', 'MobiKwik'];

const SHIFT_OPTIONS = [
  { value: 'MORNING', label: 'Morning (6 AM - 12 PM)' },
  { value: 'AFTERNOON', label: 'Afternoon (12 PM - 6 PM)' },
  { value: 'EVENING', label: 'Evening (6 PM - 12 AM)' },
  { value: 'ANY', label: 'Any Time / Flexible' },
];

const confettiPieces = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.5,
  color: ['#f97316', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'][i % 6],
  size: 6 + Math.random() * 8,
  rotation: Math.random() * 360,
}));

export default function BookingModal({ open, onOpenChange }: BookingModalProps) {
  const {
    selectedPG,
    selectedBed,
    selectedRoom,
    currentUser,
    isLoggedIn,
    setCurrentView,
    appliedCoupon,
    setAppliedCoupon,
    showToast,
  } = useAppStore();

  const [step, setStep] = useState(0);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RAZORPAY');
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    gender: currentUser?.gender || '',
    shiftTiming: '',
    agreedToTerms: false,
  });

  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');

  const monthRent = selectedBed?.price || selectedPG?.price || 0;
  const securityDeposit = selectedPG?.securityDeposit || Math.round(monthRent * 2);
  const advanceAmount = Math.round((selectedPG?.price || 0) * 0.5);
  const totalBeforeDiscount = advanceAmount + securityDeposit;
  const totalAmount = Math.max(0, totalBeforeDiscount - couponDiscount);
  const bookingId = `SEG${Date.now().toString(36).toUpperCase()}`;

  // Coupon validation
  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponDiscount(0);

    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    const coupon = AVAILABLE_COUPONS.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase()
    );

    if (!coupon) {
      setCouponError('Invalid coupon code');
      return;
    }

    const now = new Date();
    if (new Date(coupon.validTill) < now) {
      setCouponError('This coupon has expired');
      return;
    }

    if (totalBeforeDiscount < coupon.minAmount) {
      setCouponError(`Minimum amount ₹${coupon.minAmount.toLocaleString('en-IN')} required`);
      return;
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountPercent > 0) {
      discount = Math.round((totalBeforeDiscount * coupon.discountPercent) / 100);
    }
    if ((coupon as { flatDiscount?: number }).flatDiscount) {
      discount = (coupon as { flatDiscount?: number }).flatDiscount!;
    }
    discount = Math.min(discount, coupon.maxDiscount);

    setCouponDiscount(discount);
    setAppliedCoupon(coupon.code.toUpperCase());
    showToast(`Coupon applied! You save ₹${discount.toLocaleString('en-IN')}`);
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Image upload simulation
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Get room images - safely handle string or array format
  const roomImages = (() => {
    if (!selectedPG?.images) return [];
    // Already an array (parsed by React Query or other component)
    if (Array.isArray(selectedPG.images)) return selectedPG.images;
    // It's a string
    const str = String(selectedPG.images);
    if (!str.trim()) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON - try comma-separated or single URL
    }
    const imgs = str.split(',').map((s) => s.trim()).filter(Boolean);
    return imgs.length > 0 ? imgs : [str];
  })();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Step validation
  const canProceedFromStep1 = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (!formData.gender) {
      setError('Please select your gender.');
      return false;
    }
    if (!checkInDate) {
      setError('Please select a move-in date.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !canProceedFromStep1()) return;
    setError(null);
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleConfirmBooking = async () => {
    if (!selectedPG || !selectedBed || !currentUser || !checkInDate) return;

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          pgId: selectedPG.id,
          bedId: selectedBed.id,
          checkInDate: format(checkInDate, 'yyyy-MM-dd'),
          advancePaid: totalAmount,
          couponCode: appliedCoupon,
          discount: couponDiscount,
          paymentMethod,
          images: uploadedImages,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Booking failed');
      }

      setStep(4); // success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Razorpay checkout handler
  const openRazorpayCheckout = (options: Record<string, unknown>) => {
    const rzp = new (window as unknown as { Razorpay: new (o: Record<string, unknown>) => { open: () => void } }).Razorpay(options);
    rzp.open();
  };

  const handleRazorpayPay = async () => {
    if (!selectedPG || !selectedBed || !currentUser || !checkInDate) return;
    if (!formData.agreedToTerms) {
      setError('Please agree to the terms and conditions.');
      return;
    }

    setRazorpayLoading(true);
    setError(null);

    try {
      // Step 1: Create Razorpay order
      const orderRes = await authFetch('/api/payments/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          userId: currentUser.id,
          pgId: selectedPG.id,
          bedId: selectedBed.id,
          type: 'ADVANCE',
          userName: formData.name,
          userEmail: formData.email,
          userPhone: formData.phone,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Step 2: Define checkout options
      const rzpOptions: Record<string, unknown> = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          // Step 3: Verify payment with backend
          try {
            const verifyRes = await authFetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                userId: currentUser!.id,
                pgId: selectedPG!.id,
                amount: totalAmount,
                type: 'ADVANCE',
              }),
            });

            if (!verifyRes.ok) {
              throw new Error('Payment verification failed');
            }

            // Step 4: Create the booking after successful payment
            const res = await authFetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser!.id,
                pgId: selectedPG!.id,
                bedId: selectedBed!.id,
                checkInDate: format(checkInDate!, 'yyyy-MM-dd'),
                advancePaid: totalAmount,
                couponCode: appliedCoupon,
                discount: couponDiscount,
                paymentMethod: 'RAZORPAY',
                images: uploadedImages,
              }),
            });

            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Booking failed after payment');
            }

            showToast('Payment successful! Booking confirmed.');
            setStep(4); // success
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Payment was received but booking failed. Please contact support.');
          }
        },
        prefill: orderData.prefill,
        theme: orderData.theme,
        modal: {
          ondismiss: () => {
            showToast('Payment cancelled');
          },
        },
      };

      // Step 5: Load Razorpay script and open checkout
      if (!(window as unknown as Record<string, unknown>).Razorpay) {
        const script = document.createElement('script');
        script.src = RAZORPAY_SCRIPT_URL;
        script.async = true;
        script.onload = () => {
          openRazorpayCheckout(rzpOptions);
          setRazorpayLoading(false);
        };
        script.onerror = () => {
          setError('Failed to load payment gateway. Please try again.');
          setRazorpayLoading(false);
        };
        document.body.appendChild(script);
      } else {
        openRazorpayCheckout(rzpOptions);
        setRazorpayLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setRazorpayLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setError(null);
    setUploadedImages([]);
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    onOpenChange(false);
  };

  const handleSuccessClose = () => {
    setStep(0);
    setError(null);
    setUploadedImages([]);
    setCouponCode('');
    setCouponDiscount(0);
    onOpenChange(false);
    setCurrentView('MY_BOOKINGS');
  };

  const handleLoginRedirect = () => {
    handleClose();
    setCurrentView('LOGIN');
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCoupon(code);
      setCouponCode(code);
      setTimeout(() => setCopiedCoupon(null), 2000);
    });
  };

  // Progress calculation
  const progressPercent = step === 4 ? 100 : (step / 2) * 100;

  // Not logged in state
  if (!isLoggedIn) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Login to Book</DialogTitle>
          <div className="py-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-4"
            >
              <div className="size-20 bg-brand-teal/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="size-8 text-brand-teal" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Login to Book</h3>
              <p className="text-muted-foreground text-sm mb-6 px-4">
                You need to be logged in to book a room. Sign in to continue with your booking.
              </p>
            </motion.div>
            <Button
              onClick={handleLoginRedirect}
              className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
            >
              <LogIn className="size-4 mr-2" />
              Login / Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto border border-gold/30 shadow-gold-md">
        {/* Success State */}
        {step === 4 && (
          <div className="py-8 text-center relative">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {confettiPieces.map((piece) => (
                <motion.div
                  key={piece.id}
                  initial={{ y: -20, opacity: 0, x: '50%' }}
                  animate={{
                    y: 400,
                    opacity: [0, 1, 1, 0],
                    x: `${piece.x}%`,
                    rotate: piece.rotation,
                  }}
                  transition={{ duration: 2, delay: piece.delay, ease: 'easeOut' }}
                  className="absolute top-0 rounded-sm"
                  style={{
                    width: piece.size,
                    height: piece.size,
                    backgroundColor: piece.color,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="relative z-10"
            >
              <div className="size-20 bg-brand-lime/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  <Check className="size-10 text-brand-lime" strokeWidth={3} />
                </motion.div>
              </div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-xl font-bold text-foreground mb-2"
              >
                Booking Confirmed! 🎉
              </motion.h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-4"
              >
                <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg mb-2">
                  <span className="text-xs text-muted-foreground">Booking ID</span>
                  <span className="text-sm font-mono font-bold text-foreground">{bookingId}</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Your booking at <span className="font-medium text-foreground">{selectedPG?.name}</span> has been confirmed.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check-in: {checkInDate ? format(checkInDate, 'dd MMM yyyy') : 'N/A'}
                </p>
                {appliedCoupon && (
                  <Badge className={`mt-2 ${BADGE.green} hover:opacity-80`}>
                    <Tag className="size-3 mr-1" />
                    Coupon {appliedCoupon} saved ₹{couponDiscount.toLocaleString('en-IN')}
                  </Badge>
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="flex gap-3 justify-center"
              >
                <Button
                  variant="outline"
                  onClick={handleClose}
                >
                  Close
                </Button>
                <Button
                  onClick={handleSuccessClose}
                  className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                >
                  View My Bookings
                </Button>
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* Steps 0-2 */}
        {step < 4 && (
          <>
            {/* Stepper Header */}
            <DialogHeader>
              <DialogTitle className="text-xl">
                {step === 0 ? 'Upload Room Photos' : step === 1 ? 'Personal Details' : 'Review & Pay'}
              </DialogTitle>
              <DialogDescription>
                {step === 0
                  ? 'Capture room condition before move-in'
                  : step === 1
                  ? 'Fill in your details to book a bed'
                  : `Complete payment for ${selectedPG?.name}`}
              </DialogDescription>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="mt-3 mb-6">
              <div className="flex items-center justify-between mb-2">
                {STEPS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => i < step && setStep(i)}
                    disabled={i >= step}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <div
                      className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        i < step
                          ? 'bg-brand-teal/100 text-white'
                          : i === step
                          ? 'bg-brand-teal/15 text-brand-teal ring-2 ring-brand-teal/50'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i < step ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span
                      className={`hidden sm:inline ${
                        i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-deep to-brand-teal rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Step 0: Room Images */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Selected PG & Bed */}
                  <div className="flex items-center gap-3 bg-brand-teal/10 rounded-xl p-3">
                    <div className="size-10 bg-brand-teal/15 rounded-lg flex items-center justify-center shrink-0">
                      <BedDouble className="size-5 text-brand-teal" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-foreground truncate">{selectedPG?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedRoom?.roomCode || selectedBed?.room?.roomCode} • Bed {selectedBed?.bedNumber} • ₹{monthRent.toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-brand-lime bg-brand-lime/20">
                      Available
                    </Badge>
                  </div>

                  {/* Existing Room Images */}
                  {roomImages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="size-4 text-muted-foreground" />
                        Room Photos ({roomImages.length})
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {roomImages.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-video rounded-lg overflow-hidden bg-muted border border-border"
                          >
                            <img
                              src={img}
                              alt={`Room ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera className="size-4 text-brand-teal" />
                      Room Condition Photos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Take photos of the room condition during move-in for your records.
                    </p>

                    {/* Upload Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedImages.map((img, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative aspect-square rounded-lg overflow-hidden border-2 border-brand-teal/20 group"
                        >
                          <img
                            src={img}
                            alt={`Upload ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveImage(i)}
                            className="absolute top-1 right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                        </motion.div>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-brand-teal/40 hover:bg-brand-teal/10 transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <Camera className="size-5 text-muted-foreground group-hover:text-brand-teal transition-colors" />
                        <span className="text-[10px] text-muted-foreground group-hover:text-brand-teal transition-colors">
                          Add Photos
                        </span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 bg-brand-teal/10 p-3 rounded-lg">
                    <Sparkles className="size-4 text-brand-teal mt-0.5 shrink-0" />
                    <p className="text-xs text-brand-teal">
                      Tip: Photograph walls, furniture, fixtures, and any existing damage. This protects you during move-out.
                    </p>
                  </div>

                  <Button
                    onClick={handleNext}
                    className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white h-11"
                  >
                    Continue
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                </motion.div>
              )}

              {/* Step 1: Personal Details */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                    <User className="size-4" />
                    Your Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="booking-name">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="booking-name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="booking-phone">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="booking-phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="booking-email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="booking-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(val) => handleInputChange('gender', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Shift Timing</Label>
                      <Select
                        value={formData.shiftTiming}
                        onValueChange={(val) => handleInputChange('shiftTiming', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift timing" />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIFT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Move-in Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!checkInDate && 'text-muted-foreground'}`}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {checkInDate ? format(checkInDate, 'dd MMMM yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkInDate}
                          onSelect={setCheckInDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm">
                      <AlertCircle className="size-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                    >
                      Review & Pay
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Review & Pay */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* PG & Bed Summary */}
                  <div className="bg-brand-teal/10 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground mb-1">Booking Summary</h4>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PG Name</span>
                      <span className="text-sm font-medium">{selectedPG?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Room / Bed</span>
                      <span className="text-sm font-medium">
                        {selectedRoom?.roomCode || selectedBed?.room?.roomCode || 'N/A'} - Bed {selectedBed?.bedNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Check-in Date</span>
                      <span className="text-sm font-medium">
                        {checkInDate ? format(checkInDate, 'dd MMM yyyy') : 'N/A'}
                      </span>
                    </div>
                    {formData.shiftTiming && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Shift Timing</span>
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Clock className="size-3" />
                          {SHIFT_OPTIONS.find((s) => s.value === formData.shiftTiming)?.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tenant Info Summary */}
                  <div className="bg-muted rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Tenant Details</h4>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="text-sm">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm">{formData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Gender</span>
                      <span className="text-sm capitalize">{formData.gender?.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-brand-sage/10 border border-brand-sage/20 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Shield className="size-4" />
                      Cost Breakdown
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Rent</span>
                      <span className="text-sm font-medium text-foreground">₹{monthRent.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Advance Payment (50%)</span>
                      <span className="text-sm font-medium text-foreground">₹{advanceAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Security Deposit</span>
                      <span className="text-sm font-medium text-foreground">₹{securityDeposit.toLocaleString('en-IN')}</span>
                    </div>
                    <Separator className="bg-brand-sage/20/50" />
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-foreground">Subtotal</span>
                      <span className="text-sm font-bold text-foreground">₹{totalBeforeDiscount.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Coupon Section */}
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-brand-lime/15 border border-brand-lime/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="size-4 text-brand-lime" />
                          <div>
                            <span className="text-sm font-medium text-foreground">{appliedCoupon}</span>
                            <span className="text-xs text-brand-lime ml-2">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              placeholder="Have a coupon? Enter code"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value);
                                setCouponError('');
                              }}
                              className="pl-9 h-9 text-sm"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyCoupon}
                            className="h-9 px-4 border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"
                          >
                            Apply
                          </Button>
                        </div>
                        {couponError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            {couponError}
                          </p>
                        )}

                        {/* Quick coupon suggestions */}
                        {!couponCode && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs text-muted-foreground">Try:</span>
                            {AVAILABLE_COUPONS.filter((c) => c.applicableFor.includes('ADVANCE')).map((c) => (
                              <button
                                key={c.code}
                                onClick={() => handleCopyCoupon(c.code)}
                                className="text-xs bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full hover:bg-brand-teal/15 transition-colors flex items-center gap-1"
                              >
                                {copiedCoupon === c.code ? (
                                  <CheckCircle2 className="size-3" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                                {c.code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-brand-lime">
                        <span className="text-sm font-medium">Coupon Discount</span>
                        <span className="text-sm font-bold">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <Separator className="bg-brand-sage/20/50" />
                    <div className="flex justify-between">
                      <span className="text-base font-bold text-foreground">Total</span>
                      <div className="flex items-baseline gap-1">
                        <IndianRupee className="size-5 text-brand-teal" />
                        <span className="text-xl font-bold text-foreground">{totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="size-4" />
                      Payment Method
                    </Label>

                    {/* Razorpay - Recommended */}
                    <button
                      onClick={() => setPaymentMethod('RAZORPAY')}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                        paymentMethod === 'RAZORPAY'
                          ? 'border-brand-teal/50 bg-brand-teal/10'
                          : 'border-border bg-card hover:border-brand-teal/20 hover:bg-brand-teal/5'
                      }`}
                    >
                      <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
                        <Zap className="size-5 text-brand-teal" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Pay with Razorpay</span>
                          <Badge className="text-[10px] px-1.5 py-0 bg-brand-teal/20 text-brand-teal border-0">Recommended</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">Cards, UPI, Net Banking & Wallets — 100% secure</span>
                      </div>
                      <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        paymentMethod === 'RAZORPAY' ? 'border-brand-teal bg-brand-teal' : 'border-muted-foreground/30'
                      }`}>
                        {paymentMethod === 'RAZORPAY' && <Check className="size-3 text-white" />}
                      </div>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or pay directly</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setPaymentMethod(opt.value)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                              paymentMethod === opt.value
                                ? 'border-brand-teal/50 bg-brand-teal/10 text-brand-teal'
                                : 'border-border bg-card text-muted-foreground hover:border-brand-teal/20 hover:bg-brand-teal/10'
                            }`}
                          >
                            <Icon className="size-4" />
                            <span className="text-xs font-medium">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Payment Method Specific Inputs */}
                    <AnimatePresence mode="wait">
                      {paymentMethod === 'RAZORPAY' && (
                        <motion.div
                          key="razorpay-info"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 bg-brand-teal/5 border border-brand-teal/20 rounded-xl p-4 overflow-hidden"
                        >
                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0 mt-0.5">
                              <Zap className="size-4 text-brand-teal" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">Secure Checkout by Razorpay</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click &quot;Pay with Razorpay&quot; below to open the secure payment window. 
                                You can pay using Credit/Debit Card, UPI, Net Banking, or Wallet.
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Shield className="size-3" />
                                  256-bit SSL
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Check className="size-3" />
                                  PCI DSS Compliant
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
                        <motion.div
                          key="card-inputs"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 bg-muted rounded-xl p-4 overflow-hidden"
                        >
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Card Number</Label>
                            <Input
                              placeholder="1234 5678 9012 3456"
                              value={cardDetails.number}
                              onChange={(e) =>
                                setCardDetails((p) => ({ ...p, number: e.target.value }))
                              }
                              maxLength={19}
                              className="text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                              <Input
                                placeholder="MM/YY"
                                value={cardDetails.expiry}
                                onChange={(e) =>
                                  setCardDetails((p) => ({ ...p, expiry: e.target.value }))
                                }
                                maxLength={5}
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">CVV</Label>
                              <Input
                                placeholder="123"
                                value={cardDetails.cvv}
                                onChange={(e) =>
                                  setCardDetails((p) => ({ ...p, cvv: e.target.value }))
                                }
                                maxLength={4}
                                type="password"
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Name on Card</Label>
                            <Input
                              placeholder="Enter name on card"
                              value={cardDetails.name}
                              onChange={(e) =>
                                setCardDetails((p) => ({ ...p, name: e.target.value }))
                              }
                              className="text-sm"
                            />
                          </div>
                        </motion.div>
                      )}

                      {paymentMethod === 'UPI' && (
                        <motion.div
                          key="upi-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 bg-muted rounded-xl p-4 overflow-hidden"
                        >
                          <Label className="text-xs text-muted-foreground">UPI ID</Label>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              placeholder="yourname@upi"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              className="pl-9 text-sm"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">You will receive a payment request on your UPI app</p>
                        </motion.div>
                      )}

                      {paymentMethod === 'NET_BANKING' && (
                        <motion.div
                          key="bank-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 bg-muted rounded-xl p-4 overflow-hidden"
                        >
                          <Label className="text-xs text-muted-foreground">Select Your Bank</Label>
                          <Select value={selectedBank} onValueChange={setSelectedBank}>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Choose bank" />
                            </SelectTrigger>
                            <SelectContent>
                              {BANKS.map((bank) => (
                                <SelectItem key={bank} value={bank}>
                                  {bank}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">You will be redirected to your bank&apos;s payment page</p>
                        </motion.div>
                      )}

                      {paymentMethod === 'WALLET' && (
                        <motion.div
                          key="wallet-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 bg-muted rounded-xl p-4 overflow-hidden"
                        >
                          <Label className="text-xs text-muted-foreground">Select Wallet</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {WALLET_OPTIONS.map((w) => (
                              <button
                                key={w}
                                onClick={() => setSelectedWallet(w)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                                  selectedWallet === w
                                    ? 'border-brand-teal/50 bg-brand-teal/10 text-brand-teal'
                                    : 'border-border text-muted-foreground hover:border-brand-teal/20'
                                }`}
                              >
                                <Wallet className="size-3.5" />
                                {w}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={formData.agreedToTerms}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, agreedToTerms: checked === true }))
                      }
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-xs text-muted-foreground font-normal leading-relaxed cursor-pointer">
                      I agree to StayEg&apos;s terms of service, cancellation policy, and house rules.
                      I understand that the advance payment is non-refundable if cancelled within 7 days of check-in.
                    </Label>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm">
                      <AlertCircle className="size-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      onClick={handleConfirmBooking}
                      disabled={isSubmitting || !formData.agreedToTerms}
                      className="flex-1 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white h-11"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="size-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <>Confirm & Pay ₹{totalAmount.toLocaleString('en-IN')}</>
                      )}
                    </Button>
                    {paymentMethod === 'RAZORPAY' && (
                      <Button
                        onClick={handleRazorpayPay}
                        disabled={razorpayLoading || !formData.agreedToTerms}
                        className="flex-1 bg-gradient-to-r from-brand-teal to-brand-lime hover:from-brand-teal/90 hover:to-brand-lime/90 text-white h-11"
                      >
                        {razorpayLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="size-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            <Zap className="size-4 mr-1.5" />
                            Pay ₹{totalAmount.toLocaleString('en-IN')} with Razorpay
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
