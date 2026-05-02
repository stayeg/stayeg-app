'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Phone, User as UserIcon, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  Mail, MapPin, Briefcase, FileText, Camera, Check, Users, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/use-app-store';
import { CITIES } from '@/lib/constants';
import type { UserRole, User } from '@/lib/types';

interface SignupForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  gender: string;
  city: string;
  bio: string;
  occupation: string;
  avatarUrl: string;
  agreeTerms: boolean;
}

const INITIAL_FORM: SignupForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'TENANT',
  gender: '',
  city: '',
  bio: '',
  occupation: '',
  avatarUrl: '',
  agreeTerms: false,
};

const STEPS = [
  { number: 1, label: 'Basic Info', icon: UserIcon },
  { number: 2, label: 'Role Details', icon: Building2 },
  { number: 3, label: 'Profile', icon: Camera },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

/** Basic email format check */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Password strength: returns 0–4 */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-brand-teal' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export default function SignupPage() {
  const { login, setCurrentView, showToast } = useAppStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SignupForm>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const updateForm = (field: keyof SignupForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const validateStep1 = (): boolean => {
    if (!form.fullName.trim()) { showToast('Please enter your full name'); return false; }
    if (!isValidEmail(form.email)) { showToast('Please enter a valid email address'); return false; }
    if (form.phone.length < 10) { showToast('Please enter a valid phone number'); return false; }
    if (form.password.length < 6) { showToast('Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirmPassword) { showToast('Passwords do not match'); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!form.gender) { showToast('Please select your gender'); return false; }
    if (!form.city) { showToast('Please select your city'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleAvatarUpload = () => {
    const seed = form.fullName.replace(/\s/g, '') + Date.now();
    const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
    setAvatarPreview(url);
    setForm((prev) => ({ ...prev, avatarUrl: url }));
    showToast('Profile photo uploaded!');
  };

  const handleSocialSignup = (provider: string) => {
    showToast(provider + ' signup coming soon!');
  };

  const handleSignup = async () => {
    if (!form.agreeTerms) {
      showToast('Please agree to the Terms & Conditions');
      return;
    }

    setIsSubmitting(true);

    // Try real signup via API first
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          gender: form.gender,
          city: form.city,
          bio: form.bio,
          occupation: form.occupation,
          avatarUrl: form.avatarUrl,
        }),
      });

      const data = await res.json();

      if (res.ok && data.user && !data.demo) {
        // Real signup succeeded
        const raw = data.user;

        // OWNER accounts require admin approval — don't auto-login
        if (raw.role === 'OWNER') {
          showToast('Account created! Your PG Owner account is pending admin approval.');
          setCurrentView('LOGIN');
          setIsSubmitting(false);
          return;
        }

        // Non-OWNER roles: auto-login with JWT token
        const user: User = {
          id: raw.id,
          name: raw.name,
          email: raw.email,
          phone: raw.phone,
          role: raw.role,
          gender: raw.gender,
          isVerified: raw.is_verified ?? false,
          avatar: form.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${form.fullName}`,
          city: raw.city || form.city,
          occupation: raw.occupation || form.occupation || undefined,
          bio: raw.bio || form.bio || undefined,
          createdAt: raw.created_at,
        };
        login(user, data.token); // Pass JWT token for API auth
        showToast('Account created! Welcome, ' + form.fullName + '!');
        setIsSubmitting(false);
        return;
      }

      if (res.status === 409) {
        showToast(data.error || 'An account with this email already exists');
        setIsSubmitting(false);
        return;
      }
    } catch {
      // API call failed — fall through to demo mode
    }

    // Demo mode fallback
    await new Promise((r) => setTimeout(r, 600));
    const user: User = {
      id: `user-${Date.now()}`,
      name: form.fullName,
      email: form.email,
      phone: form.phone,
      role: form.role,
      gender: form.gender,
      city: form.city,
      occupation: form.occupation || undefined,
      bio: form.bio || undefined,
      avatar: form.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${form.fullName}`,
      isVerified: false,
      kycStatus: 'NOT_STARTED',
      createdAt: new Date().toISOString(),
    };
    login(user);
    showToast('Demo mode — account created locally');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8 bg-gradient-to-br from-brand-deep/5 via-brand-teal/8 to-background">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Branding */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="inline-flex items-center justify-center size-14 bg-gradient-to-br from-brand-deep to-brand-teal rounded-2xl shadow-lg shadow-brand-teal/20 mb-3">
            <Building2 className="size-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Create Account
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Join StayEg and find your perfect PG</p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{
                    backgroundColor: step >= s.number ? '#00ADB5' : '#f3f4f6',
                    color: step >= s.number ? '#fff' : '#9ca3af',
                    scale: step === s.number ? 1.1 : 1,
                  }}
                  className={`size-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                    step >= s.number ? 'shadow-brand-teal/20' : ''
                  }`}
                >
                  {step > s.number ? <Check className="size-5" /> : s.number}
                </motion.div>
                <span className={`text-[10px] mt-1 font-medium ${
                  step >= s.number ? 'text-brand-teal' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 mb-5">
                  <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: step > s.number ? '100%' : '0%' }}
                      className="h-full bg-brand-teal rounded-full"
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <Card className="shadow-xl shadow-brand-teal/10 border border-border bg-card">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* STEP 1: Basic Info */}
              {step === 1 && (
                <motion.div key="step-1" {...fadeInUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                      Full Name *
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={form.fullName}
                        onChange={(e) => updateForm('fullName', e.target.value)}
                        className="pl-10 h-11 border-border focus:border-brand-teal focus:ring-brand-teal/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => updateForm('email', e.target.value)}
                        className={`pl-10 h-11 border-border focus:border-brand-teal focus:ring-brand-teal/20 ${
                          form.email && !isValidEmail(form.email) ? 'border-red-400' : ''
                        }`}
                      />
                    </div>
                    {form.email && !isValidEmail(form.email) && (
                      <p className="text-[11px] text-red-500">Please enter a valid email address</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-phone" className="text-sm font-medium text-foreground">
                      Phone Number *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        className="pl-10 h-11 border-border focus:border-brand-teal focus:ring-brand-teal/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                      Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={(e) => updateForm('password', e.target.value)}
                        className="pl-10 pr-10 h-11 border-border focus:border-brand-teal focus:ring-brand-teal/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {form.password && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                passwordStrength.score >= level ? passwordStrength.color : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-[11px] font-medium ${passwordStrength.score <= 1 ? 'text-red-500' : passwordStrength.score <= 2 ? 'text-yellow-600' : passwordStrength.score <= 3 ? 'text-brand-teal' : 'text-green-600'}`}>
                            {passwordStrength.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {form.password.length}/6 min
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">
                      Confirm Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={form.confirmPassword}
                        onChange={(e) => updateForm('confirmPassword', e.target.value)}
                        className={`pl-10 pr-10 h-11 border-border focus:border-brand-teal focus:ring-brand-teal/20 ${
                          form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-400' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {form.confirmPassword && form.confirmPassword !== form.password && (
                      <p className="text-[11px] text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  <Button
                    onClick={handleNext}
                    className="w-full h-11 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-teal/20 transition-all mt-2"
                  >
                    Continue
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* STEP 2: Role Details */}
              {step === 2 && (
                <motion.div key="step-2" {...fadeInUp} className="space-y-4">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      I want to join as
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { role: 'TENANT' as UserRole, label: 'Tenant', desc: 'Find a PG', icon: UserIcon, gradient: 'from-brand-deep to-brand-teal' },
                        { role: 'OWNER' as UserRole, label: 'PG Owner', desc: 'List my PG', icon: Building2, gradient: 'from-brand-deep to-brand-teal' },
                        { role: 'VENDOR' as UserRole, label: 'Vendor', desc: 'Offer services', icon: Briefcase, gradient: 'from-purple-500 to-violet-500' },
                      ]).map((opt) => (
                        <button
                          key={opt.role}
                          onClick={() => updateForm('role', opt.role)}
                          className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                            form.role === opt.role
                              ? 'border-brand-teal bg-brand-teal/10 shadow-sm'
                              : 'border-border hover:border-muted-foreground/30 bg-card'
                          }`}
                        >
                          <div className={`size-8 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center`}>
                            <opt.icon className="size-4 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                          {form.role === opt.role && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -right-1.5 size-5 bg-brand-teal rounded-full flex items-center justify-center"
                            >
                              <Check className="size-3 text-white" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Gender *
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g.value}
                          onClick={() => updateForm('gender', g.value)}
                          className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                            form.gender === g.value
                              ? 'border-brand-teal bg-brand-teal/10 text-brand-teal'
                              : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* City Selection */}
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-sm font-medium text-foreground">
                      City *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <select
                        id="city"
                        value={form.city}
                        onChange={(e) => updateForm('city', e.target.value)}
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-border bg-card text-sm text-foreground focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all appearance-none"
                      >
                        <option value="">Select your city</option>
                        {CITIES.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1 h-11 border-border text-muted-foreground hover:bg-muted rounded-xl font-medium"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 h-11 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-teal/20 transition-all"
                    >
                      Continue
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Profile Photo & Details */}
              {step === 3 && (
                <motion.div key="step-3" {...fadeInUp} className="space-y-4">
                  {/* Profile Photo Upload */}
                  <div className="flex flex-col items-center">
                    <Label className="text-sm font-medium text-foreground mb-3">
                      Profile Photo
                    </Label>
                    <button
                      onClick={handleAvatarUpload}
                      className="relative group"
                    >
                      <div className={`size-24 rounded-full flex items-center justify-center overflow-hidden border-[3px] transition-all ${
                        avatarPreview
                          ? 'border-brand-teal shadow-lg shadow-brand-teal/10'
                          : 'border-2 border-dashed border-border bg-muted group-hover:border-brand-teal'
                      }`}>
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
                        ) : (
                          <Camera className="size-8 text-muted-foreground group-hover:text-brand-teal transition-colors" />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 size-7 bg-brand-teal rounded-full flex items-center justify-center shadow-md">
                        <Camera className="size-3.5 text-white" />
                      </div>
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-2">Click to upload photo</p>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <Label htmlFor="bio" className="text-sm font-medium text-foreground">
                      About You
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Textarea
                        id="bio"
                        placeholder="Tell us a bit about yourself..."
                        value={form.bio}
                        onChange={(e) => updateForm('bio', e.target.value)}
                        className="pl-10 min-h-[80px] border-border focus:border-brand-teal focus:ring-brand-teal/20 rounded-xl resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Occupation (for tenants) */}
                  {form.role === 'TENANT' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="occupation" className="text-sm font-medium text-foreground">
                        Occupation
                      </Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="occupation"
                          placeholder="e.g., Software Engineer, Student"
                          value={form.occupation}
                          onChange={(e) => updateForm('occupation', e.target.value)}
                          className="pl-10 h-11 border-border focus:border-brand-teal focus:ring-brand-teal/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  <div className="flex items-start gap-3 bg-muted rounded-xl p-3">
                    <Checkbox
                      id="terms"
                      checked={form.agreeTerms}
                      onCheckedChange={(checked) => updateForm('agreeTerms', !!checked)}
                      className="mt-0.5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                    <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setCurrentView('TERMS')}
                        className="text-brand-teal hover:text-foreground font-semibold"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => setCurrentView('PRIVACY')}
                        className="text-brand-teal hover:text-foreground font-semibold"
                      >
                        Privacy Policy
                      </button>
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1 h-11 border-border text-muted-foreground hover:bg-muted rounded-xl font-medium"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSignup}
                      disabled={isSubmitting}
                      className="flex-1 h-11 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-teal/20 transition-all"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="size-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="size-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Social Signup (only on step 1) */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground font-medium">or sign up with</span>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSocialSignup('Google')}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium text-muted-foreground"
              >
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button
                onClick={() => handleSocialSignup('Facebook')}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium text-muted-foreground"
              >
                <svg className="size-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </motion.div>
        )}

        {/* Back to Login */}
        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{' '}
          <button
            onClick={() => setCurrentView('LOGIN')}
            className="text-brand-teal hover:text-foreground font-semibold"
          >
            Sign In
          </button>
        </p>
      </motion.div>
    </div>
  );
}
