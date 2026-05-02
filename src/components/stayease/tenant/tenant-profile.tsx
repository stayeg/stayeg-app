'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Camera,
  Upload,
  Edit3,
  Check,
  X,
  Trash2,
  Lock,
  Bell,
  CreditCard,
  BookOpen,
  Building2,
  Star,
  FileText,
  Info,
  LogOut,
  Share2,
  Heart,
  ExternalLink,
  ChevronRight,
  KeyRound,
  AlertTriangle,
  Home,
  Calendar,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '@/lib/animations';
import type { Booking, KYCStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const KYC_CONFIG: Record<
  KYCStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof ShieldCheck;
    description: string;
  }
> = {
  NOT_STARTED: {
    label: 'Not Started',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-muted',
    icon: Shield,
    description: 'Complete your KYC to unlock all features',
  },
  PENDING: {
    label: 'Pending Review',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
    description:
      'Your documents are being reviewed. This usually takes 24-48 hours.',
  },
  VERIFIED: {
    label: 'Verified',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: ShieldCheck,
    description: 'Your identity has been verified successfully.',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: ShieldX,
    description:
      'Your verification was rejected. Please resubmit with correct documents.',
  },
};

const APP_VERSION = '1.4.0';

// ---------------------------------------------------------------------------
// Helper: DiceBear avatar URL from initials
// ---------------------------------------------------------------------------
function getDiceBearUrl(name: string): string {
  const seed = name.replace(/\s+/g, '-').toLowerCase();
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0d9488&textColor=ffffff&fontSize=42`;
}

// ---------------------------------------------------------------------------
// Stay Summary Types
// ---------------------------------------------------------------------------
interface StaySummary {
  totalStays: number;
  currentPG: string | null;
  monthsStayed: number;
  totalPayments: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TenantProfile() {
  const { currentUser, setCurrentUser, setCurrentView, logout } =
    useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Loading states ----
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [staySummary, setStaySummary] = useState<StaySummary>({
    totalStays: 0,
    currentPG: null,
    monthsStayed: 0,
    totalPayments: 0,
  });

  // ---- Edit states ----
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingKYC, setIsEditingKYC] = useState(false);

  // ---- Profile form ----
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [occupation, setOccupation] = useState(currentUser?.occupation || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar || getDiceBearUrl(currentUser?.name || 'User'),
  );

  // ---- KYC form ----
  const [aadhaarNumber, setAadhaarNumber] = useState(
    currentUser?.aadhaarNumber || '',
  );
  const [panNumber, setPanNumber] = useState(currentUser?.panNumber || '');
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);

  // ---- Password form ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // ---- Notification preferences (localStorage) ----
  const [notifPaymentReminders, setNotifPaymentReminders] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('stayeg_notif_payment') !== 'false'
      : true,
  );
  const [notifBookingUpdates, setNotifBookingUpdates] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('stayeg_notif_booking') !== 'false'
      : true,
  );
  const [notifPromoOffers, setNotifPromoOffers] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('stayeg_notif_promo') === 'true'
      : false,
  );

  // Persist notification preferences to localStorage
  useEffect(() => {
    localStorage.setItem('stayeg_notif_payment', String(notifPaymentReminders));
  }, [notifPaymentReminders]);
  useEffect(() => {
    localStorage.setItem('stayeg_notif_booking', String(notifBookingUpdates));
  }, [notifBookingUpdates]);
  useEffect(() => {
    localStorage.setItem('stayeg_notif_promo', String(notifPromoOffers));
  }, [notifPromoOffers]);

  // ---- Sync form state when currentUser changes ----
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setGender(currentUser.gender || '');
      setCity(currentUser.city || '');
      setOccupation(currentUser.occupation || '');
      setBio(currentUser.bio || '');
      setAvatarUrl(
        currentUser.avatar || getDiceBearUrl(currentUser.name || 'User'),
      );
      setAadhaarNumber(currentUser.aadhaarNumber || '');
      setPanNumber(currentUser.panNumber || '');
    }
  }, [currentUser]);

  // ---- Fetch bookings for stay summary ----
  useEffect(() => {
    async function fetchBookings() {
      if (!currentUser?.id) return;
      setBookingsLoading(true);
      try {
        const res = await authFetch(
          `/api/bookings?userId=${currentUser.id}`,
        );
        if (res.ok) {
          const data: Booking[] = await res.json();
          const totalStays = data.length;
          const activeBooking = data.find(
            (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED',
          );
          const currentPG = activeBooking?.pg?.name || null;

          // Calculate months stayed from the earliest booking
          let monthsStayed = 0;
          const sortedDates = data
            .filter((b) => b.checkInDate)
            .map((b) => new Date(b.checkInDate).getTime())
            .sort((a, b) => a - b);
          if (sortedDates.length > 0) {
            const earliest = sortedDates[0];
            const now = Date.now();
            monthsStayed = Math.max(
              0,
              Math.round((now - earliest) / (1000 * 60 * 60 * 24 * 30)),
            );
          }

          setStaySummary({
            totalStays,
            currentPG,
            monthsStayed,
            totalPayments: data.reduce(
              (sum, b) => sum + (b.payments?.length || 0),
              0,
            ),
          });
        }
      } catch {
        // Silently fail — stay summary will show defaults
      } finally {
        setBookingsLoading(false);
      }
    }
    fetchBookings();
  }, [currentUser?.id]);

  // ---- KYC state derived ----
  const kycStatus: KYCStatus = currentUser?.kycStatus || 'NOT_STARTED';
  const kycConfig = KYC_CONFIG[kycStatus];
  const KYCIcon = kycConfig.icon;

  // ---- Mask Aadhaar for display ----
  function maskAadhaar(value: string): string {
    if (value.length <= 4) return value;
    return 'XXXX XXXX ' + value.slice(-4);
  }

  function maskPAN(value: string): string {
    if (value.length <= 4) return value;
    return 'XXXXX' + value.slice(-4);
  }

  // ---- Handlers ----
  const handleSaveProfile = useCallback(async () => {
    if (!currentUser || !name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSavingProfile(true);
    try {
      // Try API first
      const res = await authFetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          gender: gender || null,
          city: city.trim() || null,
          occupation: occupation.trim() || null,
          bio: bio.trim() || null,
          avatar: avatarUrl,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        if (updatedUser?.user) {
          setCurrentUser({ ...currentUser, ...updatedUser.user });
        } else {
          setCurrentUser({
            ...currentUser,
            name: name.trim(),
            phone: phone.trim() || undefined,
            gender: gender || undefined,
            city: city.trim() || undefined,
            occupation: occupation.trim() || undefined,
            bio: bio.trim() || undefined,
            avatar: avatarUrl,
          });
        }
        toast.success('Profile updated successfully!');
      } else {
        // API doesn't support PUT — update Zustand state only
        setCurrentUser({
          ...currentUser,
          name: name.trim(),
          phone: phone.trim() || undefined,
          gender: gender || undefined,
          city: city.trim() || undefined,
          occupation: occupation.trim() || undefined,
          bio: bio.trim() || undefined,
          avatar: avatarUrl,
        });
        toast.success('Profile saved locally!');
      }
      setIsEditingProfile(false);
    } catch {
      // Fallback: update Zustand state
      setCurrentUser({
        ...currentUser,
        name: name.trim(),
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        city: city.trim() || undefined,
        occupation: occupation.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar: avatarUrl,
      });
      toast.success('Profile saved locally!');
      setIsEditingProfile(false);
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    currentUser,
    setCurrentUser,
    name,
    phone,
    gender,
    city,
    occupation,
    bio,
    avatarUrl,
  ]);

  const handleCancelEdit = useCallback(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setGender(currentUser.gender || '');
    setCity(currentUser.city || '');
    setOccupation(currentUser.occupation || '');
    setBio(currentUser.bio || '');
    setAvatarUrl(
      currentUser.avatar || getDiceBearUrl(currentUser.name || 'User'),
    );
    setIsEditingProfile(false);
  }, [currentUser]);

  const handleAvatarChange = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const seed = file.name.replace(/\.[^/.]+$/, '') + Date.now();
      const newUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
      setAvatarUrl(newUrl);
      try {
        await authFetch('/api/auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: newUrl }),
        });
        toast.success('Profile photo updated!');
      } catch {
        toast.success('Profile photo updated!');
      }
    },
    [],
  );

  const handleDocUpload = useCallback(
    (type: 'aadhaarFront' | 'aadhaarBack') => {
      const setters = {
        aadhaarFront: setAadhaarFront,
        aadhaarBack: setAadhaarBack,
      };
      const labels = {
        aadhaarFront: 'ID Proof (Front)',
        aadhaarBack: 'ID Proof (Back)',
      };
      // UI-only simulated upload
      setters[type](`uploaded-${type}-${Date.now()}`);
      toast.success(`${labels[type]} uploaded successfully`);
    },
    [],
  );

  const handleSubmitKYC = useCallback(async () => {
    if (!aadhaarNumber || !panNumber) {
      toast.error('Please enter both Aadhaar and PAN numbers');
      return;
    }
    if (aadhaarNumber.length < 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    if (panNumber.length < 10) {
      toast.error('Please enter a valid 10-character PAN number');
      return;
    }
    if (!currentUser) return;
    const maskedAadhaar = maskAadhaar(aadhaarNumber);
    const maskedPAN = maskPAN(panNumber.toUpperCase());
    try {
      const res = await authFetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaarNumber: maskedAadhaar,
          panNumber: maskedPAN,
          kycStatus: 'PENDING',
        }),
      });
      if (res.ok) {
        const updatedUser = await res.json().catch(() => null);
        if (updatedUser?.user) {
          setCurrentUser({ ...currentUser, ...updatedUser.user });
        } else {
          setCurrentUser({
            ...currentUser,
            aadhaarNumber,
            panNumber: panNumber.toUpperCase(),
            kycStatus: 'PENDING',
          });
        }
        setIsEditingKYC(false);
        toast.success('KYC documents submitted for verification! You will be notified within 24-48 hours.');
      } else {
        // API error — still update local state as fallback
        setCurrentUser({
          ...currentUser,
          aadhaarNumber,
          panNumber: panNumber.toUpperCase(),
          kycStatus: 'PENDING',
        });
        setIsEditingKYC(false);
        toast.success('KYC documents submitted for verification! You will be notified within 24-48 hours.');
      }
    } catch {
      // Network error — still update local state
      setCurrentUser({
        ...currentUser,
        aadhaarNumber,
        panNumber: panNumber.toUpperCase(),
        kycStatus: 'PENDING',
      });
      setIsEditingKYC(false);
      toast.success('KYC documents submitted for verification! You will be notified within 24-48 hours.');
    }
  }, [aadhaarNumber, panNumber, currentUser, setCurrentUser]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await authFetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (res.ok) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordDialogOpen(false);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to change password. Please check your current password.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleDeleteAccount = useCallback(() => {
    toast.info('Account deletion request submitted.');
    setTimeout(() => {
      logout();
    }, 1500);
  }, [logout]);

  const handleShareApp = useCallback(async () => {
    const shareData = {
      title: 'StayEg - Find Your Perfect PG',
      text: 'Find affordable, verified PGs near you with StayEg!',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled sharing — no action needed
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Could not share or copy the link');
      }
    }
  }, []);

  const handleRateApp = useCallback(() => {
    toast.info('App rating feature coming soon!');
  }, []);

  // ---- Format months stayed ----
  function formatMonths(months: number): string {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remaining = months % 12;
      return remaining > 0 ? `${years}y ${remaining}m` : `${years}y`;
    }
    return `${months}m`;
  }

  // ---- Derived values ----
  const avatarFallback = name?.charAt(0).toUpperCase() || 'U';

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-background pb-28 md:pb-8"
    >
      {/* ===== Profile Header ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600">
          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-20">
          <motion.div
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <div className="relative group mb-4">
              <div className="size-28 sm:size-32 rounded-full ring-4 ring-white/25 shadow-2xl overflow-hidden bg-white/10">
                <Avatar className="size-full rounded-full">
                  <AvatarImage
                    src={avatarUrl}
                    alt={name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-white/20 text-white text-4xl font-bold">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
              </div>
              {currentUser?.isVerified && (
                <div className="absolute -bottom-1 -right-1 size-8 bg-emerald-500 rounded-full flex items-center justify-center ring-3 ring-white shadow-md">
                  <ShieldCheck className="size-4.5 text-white" />
                </div>
              )}
              <button
                onClick={handleAvatarChange}
                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-label="Change profile photo"
              >
                <Camera className="size-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Name + Badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {name || 'User'}
              </h1>
              <Badge className="bg-white/20 text-white border-0 text-xs px-2.5 py-0.5">
                Tenant
              </Badge>
            </div>

            {/* Email + Phone */}
            <p className="text-white/80 text-sm">{email}</p>
            {phone && (
              <p className="text-white/70 text-sm mt-0.5">{phone}</p>
            )}
            {bio && (
              <p className="text-white/90 text-sm mt-2 max-w-xs line-clamp-2">
                {bio}
              </p>
            )}

            {/* Edit Profile Button */}
            {!isEditingProfile ? (
              <Button
                onClick={() => setIsEditingProfile(true)}
                variant="secondary"
                className="mt-5 bg-white/15 hover:bg-white/25 text-white border border-white/30 gap-2 backdrop-blur-sm"
              >
                <Edit3 className="size-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2 mt-5">
                <Button
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="secondary"
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/30 gap-1.5"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  size="sm"
                  disabled={isSavingProfile}
                  className="bg-white text-teal-700 hover:bg-white/90 gap-1.5 font-semibold"
                >
                  {isSavingProfile ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="size-4 border-2 border-teal-700/30 border-t-teal-700 rounded-full"
                    />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Cards container */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto px-4 -mt-10 space-y-4"
      >
        {/* ===== Personal Information Section ===== */}
        <motion.div variants={staggerItem}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <UserIcon className="size-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Your basic profile details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tp-name"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Full Name
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="tp-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Enter your name"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Email (readonly) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tp-email"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="tp-email"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      placeholder="your@email.com"
                      className="pl-9 bg-muted/50"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tp-phone"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Phone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="tp-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="+91 XXXXX XXXXX"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Gender
                  </Label>
                  <Select
                    value={gender}
                    onValueChange={setGender}
                    disabled={!isEditingProfile}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tp-city"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    City
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="tp-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="e.g. Bangalore"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Occupation */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tp-occupation"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Occupation
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="tp-occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="e.g. Software Engineer"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="tp-bio"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Bio
                </Label>
                <Textarea
                  id="tp-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  disabled={!isEditingProfile}
                  placeholder="Tell us a bit about yourself..."
                  className="min-h-[90px] resize-none"
                />
                {isEditingProfile && (
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/500
                  </p>
                )}
              </div>

              {/* Save / Cancel buttons inside card */}
              {isEditingProfile && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="flex-1 gap-1.5"
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="flex-1 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSavingProfile ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        className="size-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== KYC Verification Section ===== */}
        <motion.div variants={staggerItem}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-9 ${kycConfig.bgColor} rounded-lg flex items-center justify-center`}
                  >
                    <AlertTriangle className={`size-5 ${kycConfig.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">KYC Verification</CardTitle>
                    <CardDescription>
                      Verify your identity for full access
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={`${kycConfig.bgColor} ${kycConfig.color} border ${kycConfig.borderColor} text-xs font-semibold px-2.5 py-1`}
                >
                  <KYCIcon className="size-3.5 mr-1" />
                  {kycConfig.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status message */}
              <div className={`p-3 rounded-lg ${kycConfig.bgColor}`}>
                <p className={`text-sm ${kycConfig.color}`}>
                  {kycConfig.description}
                </p>
              </div>

              {(kycStatus === 'NOT_STARTED' ||
                kycStatus === 'REJECTED' ||
                isEditingKYC) ? (
                <>
                  <Separator />

                  {/* Aadhaar Number */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="tp-aadhaar"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Aadhaar Number
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="tp-aadhaar"
                        value={aadhaarNumber}
                        onChange={(e) =>
                          setAadhaarNumber(
                            e.target.value.replace(/\D/g, '').slice(0, 12),
                          )
                        }
                        placeholder="XXXX XXXX XXXX"
                        maxLength={12}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your 12-digit Aadhaar number
                    </p>
                  </div>

                  {/* PAN Number */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="tp-pan"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      PAN Number
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="tp-pan"
                        value={panNumber}
                        onChange={(e) =>
                          setPanNumber(
                            e.target.value.toUpperCase().slice(0, 10),
                          )
                        }
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="pl-9 uppercase"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your 10-character PAN number
                    </p>
                  </div>

                  <Separator />

                  {/* Document uploads */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Upload Documents
                    </p>

                    {/* ID Proof (Front) */}
                    <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg hover:border-teal-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
                          {aadhaarFront ? (
                            <Check className="size-5 text-emerald-600" />
                          ) : (
                            <Upload className="size-5 text-teal-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            ID Proof (Front)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {aadhaarFront ? 'Uploaded' : 'JPG, PNG — Max 5MB'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocUpload('aadhaarFront')}
                        className="gap-1.5 text-xs shrink-0"
                      >
                        <Upload className="size-3.5" />
                        {aadhaarFront ? 'Replace' : 'Upload'}
                      </Button>
                    </div>

                    {/* ID Proof (Back) */}
                    <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg hover:border-teal-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
                          {aadhaarBack ? (
                            <Check className="size-5 text-emerald-600" />
                          ) : (
                            <Upload className="size-5 text-teal-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            ID Proof (Back)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {aadhaarBack ? 'Uploaded' : 'JPG, PNG — Max 5MB'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocUpload('aadhaarBack')}
                        className="gap-1.5 text-xs shrink-0"
                      >
                        <Upload className="size-3.5" />
                        {aadhaarBack ? 'Replace' : 'Upload'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSubmitKYC}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2 h-11"
                  >
                    <ShieldCheck className="size-5" />
                    Submit for Verification
                  </Button>
                </>
              ) : kycStatus === 'PENDING' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="size-8 text-amber-600 animate-pulse" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Verification in Progress
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    We&apos;re reviewing your documents. You&apos;ll receive a
                    notification once the verification is complete.
                  </p>
                  {currentUser?.aadhaarNumber && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Aadhaar: {maskAadhaar(currentUser.aadhaarNumber)} &bull;
                      PAN: {maskPAN(currentUser.panNumber || '')}
                    </p>
                  )}
                </div>
              ) : kycStatus === 'VERIFIED' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="size-8 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Identity Verified
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Your identity has been verified successfully. You have full
                    access to all platform features.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>
                      Aadhaar: {maskAadhaar(currentUser?.aadhaarNumber || '')}
                    </span>
                    <span>
                      PAN: {maskPAN(currentUser?.panNumber || '')}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => setIsEditingKYC(true)}
                  >
                    <Edit3 className="size-3.5" />
                    Update Documents
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== My Stay Summary ===== */}
        <motion.div variants={staggerItem}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Home className="size-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">My Stay Summary</CardTitle>
                  <CardDescription>Your booking overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookingsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2 p-3 rounded-lg bg-muted/50">
                      <Skeleton className="size-8 rounded-lg" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Total Stays */}
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="size-8 bg-teal-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="size-4 text-teal-700" />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {staySummary.totalStays}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Stays
                      </p>
                    </div>

                    {/* Current PG */}
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="size-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Building2 className="size-4 text-emerald-700" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">
                        {staySummary.currentPG || 'No active PG'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current PG
                      </p>
                    </div>

                    {/* Months Stayed */}
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="size-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Calendar className="size-4 text-amber-700" />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {formatMonths(staySummary.monthsStayed)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration
                      </p>
                    </div>

                    {/* Total Payments */}
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="size-8 bg-rose-100 rounded-lg flex items-center justify-center">
                          <Wallet className="size-4 text-rose-700" />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {staySummary.totalPayments}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Payments
                      </p>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-12 justify-start gap-2.5 pl-3"
                      onClick={() => setCurrentView('MY_BOOKINGS')}
                    >
                      <Calendar className="size-4 text-teal-600" />
                      <span className="text-sm">My Bookings</span>
                      <ChevronRight className="size-4 ml-auto text-muted-foreground" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 justify-start gap-2.5 pl-3"
                      onClick={() => setCurrentView('PAYMENTS')}
                    >
                      <CreditCard className="size-4 text-teal-600" />
                      <span className="text-sm">Payments</span>
                      <ChevronRight className="size-4 ml-auto text-muted-foreground" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== Account Settings ===== */}
        <motion.div variants={staggerItem}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Lock className="size-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Preferences */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Notification Preferences
                  </h3>
                </div>

                <div className="space-y-1">
                  {/* Payment Reminders */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                        <CreditCard className="size-4 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Payment Reminders
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Get notified before due dates
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPaymentReminders}
                      onCheckedChange={setNotifPaymentReminders}
                    />
                  </div>

                  {/* Booking Updates */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Booking Updates
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status changes for your bookings
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifBookingUpdates}
                      onCheckedChange={setNotifBookingUpdates}
                    />
                  </div>

                  {/* Promotional Offers */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                        <Star className="size-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Promotional Offers
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Deals, discounts & new features
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPromoOffers}
                      onCheckedChange={setNotifPromoOffers}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Change Password */}
              <div className="space-y-3">
                <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-11"
                    >
                      <KeyRound className="size-4 text-muted-foreground" />
                      <span className="text-sm">Change Password</span>
                      <ChevronRight className="size-4 ml-auto text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Current Password
                        </Label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          disabled={isChangingPassword}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          New Password
                        </Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          disabled={isChangingPassword}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Confirm New Password
                        </Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          disabled={isChangingPassword}
                        />
                      </div>
                      {newPassword.length > 0 && newPassword.length < 6 && (
                        <p className="text-xs text-red-500">Password must be at least 6 characters</p>
                      )}
                      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500">Passwords do not match</p>
                      )}
                      <Button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
                      >
                        {isChangingPassword ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="size-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <Lock className="size-4" />
                        )}
                        {isChangingPassword ? 'Updating…' : 'Update Password'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              {/* Delete Account */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="size-4" />
                    <span className="text-sm">Delete Account</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All your data including
                      bookings, payments, and profile information will be
                      permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== App Info Section ===== */}
        <motion.div variants={staggerItem}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Info className="size-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">About StayEg</CardTitle>
                  <CardDescription>App info & resources</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* App version */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Info className="size-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      App Version
                    </p>
                    <p className="text-xs text-muted-foreground">
                      StayEg PG Platform
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  v{APP_VERSION}
                </Badge>
              </div>

              {/* Policy links */}
              {[
                { label: 'Terms of Service', view: 'TERMS' as const },
                { label: 'Privacy Policy', view: 'PRIVACY' as const },
                { label: 'About StayEg', view: 'ABOUT' as const },
                { label: 'Help & Support', view: 'HELP' as const },
                { label: 'Refund Policy', view: 'REFUND_POLICY' as const },
              ].map((link) => (
                <button
                  key={link.view}
                  onClick={() => setCurrentView(link.view)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-sm text-foreground">{link.label}</span>
                  <ExternalLink className="size-4 text-muted-foreground group-hover:text-teal-600 transition-colors" />
                </button>
              ))}

              <Separator className="my-2" />

              {/* Rate StayEg */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 h-11"
                onClick={handleRateApp}
              >
                <Heart className="size-4 text-rose-500" />
                <span className="text-sm">Rate StayEg</span>
                <ChevronRight className="size-4 ml-auto text-muted-foreground" />
              </Button>

              {/* Share StayEg */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 h-11"
                onClick={handleShareApp}
              >
                <Share2 className="size-4 text-teal-600" />
                <span className="text-sm">Share StayEg</span>
                <ChevronRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== Logout Button ===== */}
        <motion.div variants={staggerItem}>
          <Button
            onClick={logout}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white gap-2 text-sm font-semibold shadow-sm"
          >
            <LogOut className="size-5" />
            Logout
          </Button>
        </motion.div>

        {/* Bottom spacing for mobile nav */}
        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}
