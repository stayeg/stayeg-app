'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Upload,
  FileText,
  Check,
  X,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { BADGE } from '@/lib/constants';
import type { KYCStatus } from '@/lib/types';
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations';

interface KYCUploadProps {
  userKycStatus?: KYCStatus;
}

const KYC_STATUS_CONFIG: Record<KYCStatus, {
  label: string;
  badgeClass: string;
  icon: typeof Shield;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  description: string;
  subDescription?: string;
}> = {
  NOT_STARTED: {
    label: 'Not Started',
    badgeClass: BADGE.gray,
    icon: Shield,
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    description: 'Complete your KYC verification to unlock all platform features including booking, reviews, and payments.',
    subDescription: 'This is a one-time process and typically takes less than 5 minutes.',
  },
  PENDING: {
    label: 'Under Review',
    badgeClass: BADGE.yellow,
    icon: Clock,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Your documents are being reviewed by our verification team.',
    subDescription: 'This usually takes 24-48 hours. We\'ll notify you once complete.',
  },
  VERIFIED: {
    label: 'Verified',
    badgeClass: BADGE.green,
    icon: ShieldCheck,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Your identity has been successfully verified!',
    subDescription: 'You have full access to all platform features.',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: BADGE.red,
    icon: ShieldX,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Your verification was rejected. Please review the reason below and resubmit with correct documents.',
    subDescription: 'Reason: Document image was blurry or unreadable.',
  },
};

interface UploadedDoc {
  name: string;
  preview: string;
  size: string;
}

export default function KYCUpload({ userKycStatus = 'NOT_STARTED' }: KYCUploadProps) {
  const status = userKycStatus;
  const config = KYC_STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  // Form state
  const [aadhaarFront, setAadhaarFront] = useState<UploadedDoc | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<UploadedDoc | null>(null);
  const [panFront, setPanFront] = useState<UploadedDoc | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartForm, setShowStartForm] = useState(false);

  const simulateUpload = useCallback((
    type: 'aadhaar-front' | 'aadhaar-back' | 'pan-front',
    setter: (doc: UploadedDoc | null) => void
  ) => {
    const labels = {
      'aadhaar-front': 'Aadhaar Card (Front)',
      'aadhaar-back': 'Aadhaar Card (Back)',
      'pan-front': 'PAN Card (Front)',
    };
    const sizes = ['1.2 MB', '0.8 MB', '1.5 MB', '2.1 MB', '0.6 MB'];
    const fakePreview = `https://api.dicebear.com/9.x/identicon/svg?seed=${type}${Date.now()}`;
    setter({
      name: labels[type],
      preview: fakePreview,
      size: sizes[Math.floor(Math.random() * sizes.length)],
    });
    toast.success(`${labels[type]} uploaded successfully`);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!aadhaarFront || !aadhaarBack || !panFront) {
      toast.error('Please upload all required documents');
      return;
    }
    if (!aadhaarNumber || aadhaarNumber.replace(/\D/g, '').length < 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!panNumber || panNumber.length < 10) {
      toast.error('Please enter a valid 10-character PAN number');
      return;
    }
    if (!termsAccepted) {
      toast.error('Please accept the terms to continue');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Documents submitted for verification! You will be notified within 24-48 hours.');
    }, 2000);
  }, [aadhaarFront, aadhaarBack, panFront, aadhaarNumber, panNumber, termsAccepted]);

  const handleResubmit = useCallback(() => {
    setAadhaarFront(null);
    setAadhaarBack(null);
    setPanFront(null);
    setAadhaarNumber('');
    setPanNumber('');
    setTermsAccepted(false);
    setShowStartForm(true);
  }, []);

  // ---- RENDER STATES ----

  if (status === 'PENDING') {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Card className={`border ${config.borderColor}`}>
          <CardContent className="p-6">
            <motion.div
              className="flex flex-col items-center text-center py-4"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
            >
              <div className="relative size-20 mb-4">
                <div className="absolute inset-0 rounded-full bg-amber-100 animate-ping opacity-20" />
                <div className="relative size-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <Loader2 className="size-10 text-amber-600 animate-spin" />
                </div>
              </div>

              <Badge className={`${config.badgeClass} mb-3 border-0`}>
                <Clock className="size-3 mr-1" />
                {config.label}
              </Badge>

              <h3 className="text-xl font-bold text-foreground mb-2">
                Verification in Progress
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {config.description}
              </p>

              <div className="mt-6 w-full max-w-sm space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <Check className="size-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-foreground">Aadhaar Card submitted</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <Check className="size-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-foreground">PAN Card submitted</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                {config.subDescription}
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'VERIFIED') {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Card className={`border ${config.borderColor}`}>
          <CardContent className="p-6">
            <motion.div
              className="flex flex-col items-center text-center py-2"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
            >
              <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <ShieldCheck className="size-10 text-green-600" />
              </div>

              <Badge className={`${config.badgeClass} mb-3 border-0`}>
                <ShieldCheck className="size-3 mr-1" />
                {config.label}
              </Badge>

              <h3 className="text-xl font-bold text-foreground mb-2">
                Identity Verified
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {config.description}
              </p>

              <div className="mt-5 w-full max-w-sm">
                <div className="rounded-lg border border-green-200 overflow-hidden">
                  <div className="bg-green-50 px-4 py-3">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                      Verified Information
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Aadhaar Number</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        **** **** 4523
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">PAN Number</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        ABCDE****F
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Verified On</span>
                      <span className="text-sm font-medium text-foreground">
                        15 Jan 2025
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Card className={`border ${config.borderColor}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className={`${config.badgeClass} border-0`}>
                <ShieldX className="size-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <CardTitle className="text-lg">Verification Rejected</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Rejection Reason</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    The uploaded document image was blurry or unreadable. Please resubmit with clear, high-quality photos of your documents.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleResubmit}
                className="w-full bg-brand-teal hover:bg-brand-deep text-white gap-2 h-11"
              >
                <RefreshCw className="size-4" />
                Re-submit Documents
              </Button>
            </motion.div>

            <AnimatePresence>
              {showStartForm && (
                <KYCUploadForm
                  aadhaarFront={aadhaarFront}
                  setAadhaarFront={setAadhaarFront}
                  aadhaarBack={aadhaarBack}
                  setAadhaarBack={setAadhaarBack}
                  panFront={panFront}
                  setPanFront={setPanFront}
                  aadhaarNumber={aadhaarNumber}
                  setAadhaarNumber={setAadhaarNumber}
                  panNumber={panNumber}
                  setPanNumber={setPanNumber}
                  termsAccepted={termsAccepted}
                  setTermsAccepted={setTermsAccepted}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  simulateUpload={simulateUpload}
                />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // NOT_STARTED default state
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <Card className={`border ${config.borderColor}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${config.bgColor}`}>
              <StatusIcon className={`size-5 ${config.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">KYC Verification</CardTitle>
              <CardDescription>{config.subDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!showStartForm ? (
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                <p className="text-sm text-foreground">{config.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: FileText, label: 'Aadhaar Card', desc: 'Front & Back' },
                  { icon: Eye, label: 'PAN Card', desc: 'Front side' },
                  { icon: ShieldCheck, label: 'Quick Process', desc: '24-48 hours' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="size-9 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                      <item.icon className="size-4 text-brand-teal" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowStartForm(true)}
                className="w-full bg-brand-teal hover:bg-brand-deep text-white gap-2 h-11"
              >
                <Shield className="size-4" />
                Start KYC Verification
              </Button>
            </motion.div>
          ) : (
            <KYCUploadForm
              aadhaarFront={aadhaarFront}
              setAadhaarFront={setAadhaarFront}
              aadhaarBack={aadhaarBack}
              setAadhaarBack={setAadhaarBack}
              panFront={panFront}
              setPanFront={setPanFront}
              aadhaarNumber={aadhaarNumber}
              setAadhaarNumber={setAadhaarNumber}
              panNumber={panNumber}
              setPanNumber={setPanNumber}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              simulateUpload={simulateUpload}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Upload Form Sub-component ----

interface KYCUploadFormProps {
  aadhaarFront: UploadedDoc | null;
  setAadhaarFront: (doc: UploadedDoc | null) => void;
  aadhaarBack: UploadedDoc | null;
  setAadhaarBack: (doc: UploadedDoc | null) => void;
  panFront: UploadedDoc | null;
  setPanFront: (doc: UploadedDoc | null) => void;
  aadhaarNumber: string;
  setAadhaarNumber: (val: string) => void;
  panNumber: string;
  setPanNumber: (val: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (val: boolean) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  simulateUpload: (type: 'aadhaar-front' | 'aadhaar-back' | 'pan-front', setter: (doc: UploadedDoc | null) => void) => void;
}

function KYCUploadForm({
  aadhaarFront,
  setAadhaarFront,
  aadhaarBack,
  setAadhaarBack,
  panFront,
  setPanFront,
  aadhaarNumber,
  setAadhaarNumber,
  panNumber,
  setPanNumber,
  termsAccepted,
  setTermsAccepted,
  isSubmitting,
  onSubmit,
  simulateUpload,
}: KYCUploadFormProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Aadhaar Card Section */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brand-teal" />
          <h4 className="text-sm font-semibold text-foreground">Aadhaar Card</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Front Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Front Side</Label>
            {aadhaarFront ? (
              <div className="relative rounded-lg overflow-hidden border border-green-200 bg-green-50">
                <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                  <img
                    src={aadhaarFront.preview}
                    alt="Aadhaar Front"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Uploaded</span>
                    <span className="text-xs text-muted-foreground">({aadhaarFront.size})</span>
                  </div>
                  <button
                    onClick={() => simulateUpload('aadhaar-front', setAadhaarFront)}
                    className="text-xs text-brand-teal hover:underline"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => simulateUpload('aadhaar-front', setAadhaarFront)}
                className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-border hover:border-brand-teal/50 transition-colors bg-muted/30 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="size-10 rounded-full bg-brand-teal/10 flex items-center justify-center group-hover:bg-brand-teal/20 transition-colors">
                  <Upload className="size-5 text-brand-teal" />
                </div>
                <span className="text-xs text-muted-foreground">Upload Front</span>
                <span className="text-[10px] text-muted-foreground">JPG, PNG - Max 5MB</span>
              </button>
            )}
          </div>

          {/* Back Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Back Side</Label>
            {aadhaarBack ? (
              <div className="relative rounded-lg overflow-hidden border border-green-200 bg-green-50">
                <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                  <img
                    src={aadhaarBack.preview}
                    alt="Aadhaar Back"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Uploaded</span>
                    <span className="text-xs text-muted-foreground">({aadhaarBack.size})</span>
                  </div>
                  <button
                    onClick={() => simulateUpload('aadhaar-back', setAadhaarBack)}
                    className="text-xs text-brand-teal hover:underline"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => simulateUpload('aadhaar-back', setAadhaarBack)}
                className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-border hover:border-brand-teal/50 transition-colors bg-muted/30 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="size-10 rounded-full bg-brand-teal/10 flex items-center justify-center group-hover:bg-brand-teal/20 transition-colors">
                  <Upload className="size-5 text-brand-teal" />
                </div>
                <span className="text-xs text-muted-foreground">Upload Back</span>
                <span className="text-[10px] text-muted-foreground">JPG, PNG - Max 5MB</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <Separator />

      {/* PAN Card Section */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brand-teal" />
          <h4 className="text-sm font-semibold text-foreground">PAN Card</h4>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Front Side</Label>
          {panFront ? (
            <div className="relative rounded-lg overflow-hidden border border-green-200 bg-green-50 max-w-xs">
              <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                <img
                  src={panFront.preview}
                  alt="PAN Front"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Uploaded</span>
                  <span className="text-xs text-muted-foreground">({panFront.size})</span>
                </div>
                <button
                  onClick={() => simulateUpload('pan-front', setPanFront)}
                  className="text-xs text-brand-teal hover:underline"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => simulateUpload('pan-front', setPanFront)}
              className="w-full max-w-xs aspect-[16/10] rounded-lg border-2 border-dashed border-border hover:border-brand-teal/50 transition-colors bg-muted/30 flex flex-col items-center justify-center gap-2 group"
            >
              <div className="size-10 rounded-full bg-brand-teal/10 flex items-center justify-center group-hover:bg-brand-teal/20 transition-colors">
                <Upload className="size-5 text-brand-teal" />
              </div>
              <span className="text-xs text-muted-foreground">Upload PAN Card</span>
              <span className="text-[10px] text-muted-foreground">JPG, PNG - Max 5MB</span>
            </button>
          )}
        </div>
      </motion.div>

      <Separator />

      {/* Number Inputs */}
      <motion.div variants={staggerItem} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kyc-aadhaar" className="text-sm font-medium text-muted-foreground">
            Aadhaar Number <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="kyc-aadhaar"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="XXXX XXXX XXXX"
              maxLength={14}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter your 12-digit Aadhaar number</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kyc-pan" className="text-sm font-medium text-muted-foreground">
            PAN Number <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="kyc-pan"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="pl-9 uppercase"
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter your 10-character PAN number</p>
        </div>
      </motion.div>

      <Separator />

      {/* Terms Checkbox */}
      <motion.div variants={staggerItem}>
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            id="kyc-terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="kyc-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            I confirm that the documents I am submitting are authentic and belong to me. I understand that providing
            false information may result in account suspension and legal action as per Indian law.
          </Label>
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.div variants={staggerItem}>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !termsAccepted}
          className="w-full bg-brand-teal hover:bg-brand-deep text-white gap-2 h-11 font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting for Verification...
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" />
              Submit for Verification
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
