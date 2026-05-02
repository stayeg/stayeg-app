'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  BellOff,
  CreditCard,
  BookOpen,
  Building2,
  Wrench,
  Star,
  Eye,
  EyeOff,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/use-app-store';
import { CITIES, BADGE } from '@/lib/constants';
import type { KYCStatus, UserRole } from '@/lib/types';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  TENANT: 'Tenant',
  OWNER: 'PG Owner',
  VENDOR: 'Vendor',
  ADMIN: 'Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  TENANT: BADGE.blue,
  OWNER: 'bg-brand-sage/15 text-brand-sage',
  VENDOR: 'bg-brand-lime/15 text-brand-lime-dark',
  ADMIN: BADGE.purple,
};

const KYC_CONFIG: Record<KYCStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof ShieldCheck;
  description: string;
}> = {
  NOT_STARTED: {
    label: 'Not Started',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: Shield,
    description: 'Complete your KYC to unlock all features',
  },
  PENDING: {
    label: 'Pending Review',
    color: 'text-brand-sage',
    bgColor: 'bg-brand-sage/10',
    icon: Clock,
    description: 'Your documents are being reviewed. This usually takes 24-48 hours.',
  },
  VERIFIED: {
    label: 'Verified',
    color: 'text-brand-lime',
    bgColor: 'bg-brand-lime/15',
    icon: ShieldCheck,
    description: 'Your identity has been verified successfully.',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    icon: ShieldX,
    description: 'Your verification was rejected. Please resubmit with correct documents.',
  },
};

const STATS_CONFIG: Record<UserRole, { label: string; icon: typeof CreditCard; value: number; color: string; isMonetary?: boolean }[]> = {
  TENANT: [
    { label: 'Total Bookings', icon: BookOpen, value: 3, color: 'bg-brand-teal/10 text-brand-teal' },
    { label: 'Active Stay', icon: Building2, value: 1, color: 'bg-brand-lime/15 text-brand-lime' },
    { label: 'Reviews Given', icon: Star, value: 5, color: 'bg-brand-sage/10 text-brand-sage' },
    { label: 'Payments', icon: CreditCard, value: 8, color: 'bg-brand-teal/10 text-brand-teal' },
  ],
  OWNER: [
    { label: 'My PGs', icon: Building2, value: 3, color: 'bg-brand-teal/10 text-brand-teal' },
    { label: 'Total Rooms', icon: Briefcase, value: 24, color: 'bg-brand-lime/15 text-brand-lime' },
    { label: 'Active Tenants', icon: UserIcon, value: 42, color: 'bg-brand-sage/10 text-brand-sage' },
    { label: 'Revenue', icon: CreditCard, value: 186400, color: 'bg-brand-teal/10 text-brand-teal', isMonetary: true },
  ],
  VENDOR: [
    { label: 'Services Done', icon: Wrench, value: 56, color: 'bg-brand-teal/10 text-brand-teal' },
    { label: 'Rating', icon: Star, value: 4.8, color: 'bg-brand-sage/10 text-brand-sage' },
    { label: 'Earnings', icon: CreditCard, value: 74500, color: 'bg-brand-lime/15 text-brand-lime', isMonetary: true },
    { label: 'Pending Jobs', icon: Clock, value: 2, color: 'bg-brand-teal/10 text-brand-teal' },
  ],
  ADMIN: [
    { label: 'Total Users', icon: UserIcon, value: 2840, color: 'bg-brand-teal/10 text-brand-teal' },
    { label: 'Active PGs', icon: Building2, value: 156, color: 'bg-brand-lime/15 text-brand-lime' },
    { label: 'Revenue', icon: CreditCard, value: 2400000, color: 'bg-brand-sage/10 text-brand-sage', isMonetary: true },
    { label: 'Pending KYC', icon: ShieldAlert, value: 23, color: 'bg-brand-teal/10 text-brand-teal' },
  ],
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

export default function ProfilePage() {
  const { currentUser, setCurrentUser, showToast, logout } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingKYC, setIsEditingKYC] = useState(false);

  // Profile form
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [age, setAge] = useState(String(currentUser?.age || ''));
  const [occupation, setOccupation] = useState(currentUser?.occupation || '');
  const [city, setCity] = useState(currentUser?.city || 'Bangalore');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');

  // KYC form
  const [aadhaarNumber, setAadhaarNumber] = useState(currentUser?.aadhaarNumber || '');
  const [panNumber, setPanNumber] = useState(currentUser?.panNumber || '');
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [panDoc, setPanDoc] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification preferences (persisted to localStorage)
  const [emailNotifs, setEmailNotifs] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('stayeg_notif_email') !== 'false';
    return true;
  });
  const [smsNotifs, setSmsNotifs] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('stayeg_notif_sms') === 'true';
    return false;
  });
  const [bookingNotifs, setBookingNotifs] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('stayeg_notif_booking') !== 'false';
    return true;
  });
  const [promoNotifs, setPromoNotifs] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('stayeg_notif_promo') === 'true';
    return false;
  });

  useEffect(() => { localStorage.setItem('stayeg_notif_email', String(emailNotifs)); }, [emailNotifs]);
  useEffect(() => { localStorage.setItem('stayeg_notif_sms', String(smsNotifs)); }, [smsNotifs]);
  useEffect(() => { localStorage.setItem('stayeg_notif_booking', String(bookingNotifs)); }, [bookingNotifs]);
  useEffect(() => { localStorage.setItem('stayeg_notif_promo', String(promoNotifs)); }, [promoNotifs]);

  const kycStatus: KYCStatus = currentUser?.kycStatus || 'NOT_STARTED';
  const kycConfig = KYC_CONFIG[kycStatus];
  const KYCIcon = kycConfig.icon;
  const stats = STATS_CONFIG[currentUser?.role || 'TENANT'];

  const handleSaveProfile = useCallback(() => {
    if (!currentUser) return;
    setCurrentUser({
      ...currentUser,
      name,
      email,
      phone,
      gender,
      age: age ? parseInt(age, 10) : undefined,
      occupation,
      city,
      bio,
      avatar: avatarUrl,
    });
    setIsEditingProfile(false);
    toast.success('Profile updated successfully!');
  }, [currentUser, setCurrentUser, name, email, phone, gender, age, occupation, city, bio, avatarUrl]);

  const handleCancelEdit = useCallback(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setEmail(currentUser.email);
    setPhone(currentUser.phone || '');
    setGender(currentUser.gender || '');
    setAge(String(currentUser.age || ''));
    setOccupation(currentUser.occupation || '');
    setCity(currentUser.city || 'Bangalore');
    setBio(currentUser.bio || '');
    setAvatarUrl(currentUser.avatar || '');
    setIsEditingProfile(false);
  }, [currentUser]);

  const handleAvatarChange = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const seed = file.name.replace(/\.[^/.]+$/, '') + Date.now();
    const newUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    setAvatarUrl(newUrl);
    toast.success('Profile photo updated!');
  }, []);

  const handleDocUpload = useCallback((type: 'aadhaarFront' | 'aadhaarBack' | 'pan') => {
    const setters = { aadhaarFront: setAadhaarFront, aadhaarBack: setAadhaarBack, pan: setPanDoc };
    const labels = { aadhaarFront: 'Aadhaar Card (Front)', aadhaarBack: 'Aadhaar Card (Back)', pan: 'PAN Card' };
    // Simulated file upload
    const fakeUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=${type}${Date.now()}`;
    setters[type](fakeUrl);
    toast.success(`${labels[type]} uploaded successfully`);
  }, []);

  const handleSubmitKYC = useCallback(() => {
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
    setCurrentUser({
      ...currentUser,
      aadhaarNumber,
      panNumber: panNumber.toUpperCase(),
      kycStatus: 'PENDING',
    });
    setIsEditingKYC(false);
    toast.success('KYC documents submitted for verification! You will be notified within 24-48 hours.');
  }, [aadhaarNumber, panNumber, currentUser, setCurrentUser]);

  const handleChangePassword = useCallback(() => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    // Demo mode — no actual password verification is performed
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated! (Demo mode — no actual verification)');
  }, [currentPassword, newPassword, confirmPassword]);

  const handleDeleteAccount = useCallback(() => {
    toast.success('Account deletion request submitted. You will be logged out.');
    setTimeout(() => {
      logout();
    }, 1500);
  }, [logout]);

  const formatStatValue = (value: number, isMonetary = false) => {
    if (isMonetary) {
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
      if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
      return `₹${value}`;
    }
    if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return String(value);
  };

  return (
    <div className="min-h-screen bg-muted/50 pb-24 md:pb-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-brand-deep via-primary to-brand-teal relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />

        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6"
          >
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="size-24 sm:size-28 ring-4 ring-white/30 shadow-xl">
                <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
                  {name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarChange}
                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
              {currentUser?.isVerified && (
                <div className="absolute -bottom-1 -right-1 size-7 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                  <ShieldCheck className="size-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{name}</h1>
                <Badge className={`${ROLE_COLORS[currentUser?.role || 'TENANT']} text-xs border-0`}>
                  {ROLE_LABELS[currentUser?.role || 'TENANT']}
                </Badge>
              </div>
              <p className="text-white/80 text-sm">{email}</p>
              {bio && <p className="text-white/90 text-sm mt-1 line-clamp-1">{bio}</p>}
            </div>

            {/* Edit Button */}
            {!isEditingProfile ? (
              <Button
                onClick={() => setIsEditingProfile(true)}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2"
              >
                <Edit3 className="size-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-1"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  size="sm"
                  className="bg-card text-brand-teal hover:bg-muted gap-1"
                >
                  <Check className="size-4" />
                  Save
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 -mt-8"
      >
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                    <stat.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-foreground truncate">
                      {stat.label === 'Rating' ? stat.value.toFixed(1) : formatStatValue(stat.value, stat.isMonetary)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Grid */}
      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">

        {/* Personal Info Section */}
        <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="size-9 bg-brand-teal/15 rounded-lg flex items-center justify-center">
                  <UserIcon className="size-5 text-brand-teal" />
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
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="text-sm font-medium text-muted-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Enter your name"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="text-sm font-medium text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="your@email.com"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="profile-phone" className="text-sm font-medium text-muted-foreground">
                    Phone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="profile-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="+91 XXXXX XXXXX"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
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

                {/* Age */}
                <div className="space-y-2">
                  <Label htmlFor="profile-age" className="text-sm font-medium text-muted-foreground">
                    Age
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="profile-age"
                      type="number"
                      min="16"
                      max="100"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Your age"
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Occupation */}
                <div className="space-y-2">
                  <Label htmlFor="profile-occupation" className="text-sm font-medium text-muted-foreground">
                    Occupation
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="profile-occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="e.g. Software Engineer"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Address & Bio Section */}
        <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="size-9 bg-brand-teal/15 rounded-lg flex items-center justify-center">
                  <MapPin className="size-5 text-brand-teal" />
                </div>
                <div>
                  <CardTitle className="text-lg">Address & Bio</CardTitle>
                  <CardDescription>Where you are and about you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* City */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">City</Label>
                <Select
                  value={city}
                  onValueChange={setCity}
                  disabled={!isEditingProfile}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="profile-bio" className="text-sm font-medium text-muted-foreground">
                  About Me
                </Label>
                <Textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="Tell us a bit about yourself..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                {isEditingProfile && (
                  <p className="text-xs text-muted-foreground text-right">{bio.length}/500 characters</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Photo Section */}
        <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="size-9 bg-brand-teal/15 rounded-lg flex items-center justify-center">
                  <Camera className="size-5 text-brand-teal" />
                </div>
                <div>
                  <CardTitle className="text-lg">Profile Photo</CardTitle>
                  <CardDescription>Update your profile picture</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="size-20 ring-2 ring-brand-teal/20">
                  <AvatarImage src={avatarUrl} alt={name} />
                  <AvatarFallback className="bg-brand-teal/15 text-brand-teal text-xl font-bold">
                    {name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-muted-foreground mb-2">
                    {avatarUrl ? 'Your current profile photo' : 'No photo uploaded yet'}
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleAvatarChange}
                    disabled={!isEditingProfile}
                    className="gap-2 border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"
                  >
                    <Upload className="size-4" />
                    Upload Photo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KYC Verification Section */}
        <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`size-9 ${kycConfig.bgColor} rounded-lg flex items-center justify-center`}>
                    <ShieldAlert className={`size-5 ${kycConfig.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">KYC Verification</CardTitle>
                    <CardDescription>Verify your identity for full access</CardDescription>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${kycConfig.bgColor}`}>
                  <KYCIcon className={`size-4 ${kycConfig.color}`} />
                  <span className={`text-xs font-semibold ${kycConfig.color}`}>{kycConfig.label}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Message */}
              <div className={`p-3 rounded-lg ${kycConfig.bgColor}`}>
                <p className={`text-sm ${kycConfig.color}`}>{kycConfig.description}</p>
              </div>

              {(kycStatus === 'NOT_STARTED' || kycStatus === 'REJECTED' || isEditingKYC) ? (
                <>
                  <Separator />

                  {/* Aadhaar Number */}
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar" className="text-sm font-medium text-muted-foreground">
                      Aadhaar Number
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="aadhaar"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="XXXX XXXX XXXX"
                        maxLength={12}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Enter your 12-digit Aadhaar number</p>
                  </div>

                  {/* PAN Number */}
                  <div className="space-y-2">
                    <Label htmlFor="pan" className="text-sm font-medium text-muted-foreground">
                      PAN Number
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="pan"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="pl-9 uppercase"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Enter your 10-character PAN number</p>
                  </div>

                  <Separator />

                  {/* Document Uploads */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Upload Documents</p>

                    {/* Aadhaar Front */}
                    <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg hover:border-brand-teal/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-brand-teal/10 rounded-lg flex items-center justify-center">
                          {aadhaarFront ? (
                            <Check className="size-5 text-brand-lime" />
                          ) : (
                            <Upload className="size-5 text-brand-teal" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Aadhaar Card (Front)</p>
                          <p className="text-xs text-muted-foreground">
                            {aadhaarFront ? 'Uploaded' : 'JPG, PNG - Max 5MB'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocUpload('aadhaarFront')}
                        className="gap-1.5 text-xs"
                      >
                        <Upload className="size-3.5" />
                        {aadhaarFront ? 'Replace' : 'Upload'}
                      </Button>
                    </div>

                    {/* Aadhaar Back */}
                    <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg hover:border-brand-teal/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-brand-teal/10 rounded-lg flex items-center justify-center">
                          {aadhaarBack ? (
                            <Check className="size-5 text-brand-lime" />
                          ) : (
                            <Upload className="size-5 text-brand-teal" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Aadhaar Card (Back)</p>
                          <p className="text-xs text-muted-foreground">
                            {aadhaarBack ? 'Uploaded' : 'JPG, PNG - Max 5MB'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocUpload('aadhaarBack')}
                        className="gap-1.5 text-xs"
                      >
                        <Upload className="size-3.5" />
                        {aadhaarBack ? 'Replace' : 'Upload'}
                      </Button>
                    </div>

                    {/* PAN Card */}
                    <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg hover:border-brand-teal/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-brand-teal/10 rounded-lg flex items-center justify-center">
                          {panDoc ? (
                            <Check className="size-5 text-brand-lime" />
                          ) : (
                            <Upload className="size-5 text-brand-teal" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">PAN Card</p>
                          <p className="text-xs text-muted-foreground">
                            {panDoc ? 'Uploaded' : 'JPG, PNG - Max 5MB'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocUpload('pan')}
                        className="gap-1.5 text-xs"
                      >
                        <Upload className="size-3.5" />
                        {panDoc ? 'Replace' : 'Upload'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitKYC}
                    className="w-full bg-brand-teal hover:bg-brand-deep text-white gap-2 h-11"
                  >
                    <ShieldCheck className="size-5" />
                    Submit for Verification
                  </Button>
                </>
              ) : kycStatus === 'PENDING' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-brand-sage/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="size-8 text-brand-sage animate-pulse" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Verification in Progress</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    We are reviewing your documents. You&apos;ll receive a notification once the verification is complete.
                    This usually takes 24-48 hours.
                  </p>
                  {currentUser?.aadhaarNumber && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Aadhaar: **** **** {currentUser.aadhaarNumber.slice(-4)} &bull; PAN: ****{currentUser.panNumber?.slice(-4)}
                    </p>
                  )}
                </div>
              ) : kycStatus === 'VERIFIED' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-brand-lime/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="size-8 text-brand-lime" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Identity Verified</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your identity has been verified successfully. You have full access to all platform features.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Aadhaar: **** **** {currentUser?.aadhaarNumber?.slice(-4)}</span>
                    <span>PAN: ****{currentUser?.panNumber?.slice(-4)}</span>
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

        {/* Account Settings Section */}
        <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="size-9 bg-brand-teal/15 rounded-lg flex items-center justify-center">
                  <Lock className="size-5 text-brand-teal" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account Settings</CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Preferences */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">SMS Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive updates via SMS</p>
                      </div>
                    </div>
                    <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <BookOpen className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Booking Updates</p>
                        <p className="text-xs text-muted-foreground">Get notified about booking changes</p>
                      </div>
                    </div>
                    <Switch checked={bookingNotifs} onCheckedChange={setBookingNotifs} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <BellOff className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Promotional Emails</p>
                        <p className="text-xs text-muted-foreground">Receive offers and promotions</p>
                      </div>
                    </div>
                    <Switch checked={promoNotifs} onCheckedChange={setPromoNotifs} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Change Password */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
                </div>

                <div className="space-y-3 max-w-md">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password" className="text-xs text-muted-foreground">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs text-muted-foreground">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    variant="outline"
                    className="gap-2 border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"
                  >
                    <Lock className="size-4" />
                    Update Password
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Delete Account */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Once you delete your account, there is no going back. All your data, bookings, and settings will be permanently removed.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="size-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all
                        your data from our servers, including your bookings, payment history, and personal information.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
