'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flag, Send, ShieldCheck, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/lib/toast';
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations';
import { authFetch } from '@/lib/api-client';
import { useAppStore } from '@/store/use-app-store';

interface ReportDialogProps {
  targetId: string;
  targetType: 'PG' | 'USER' | 'REVIEW';
  trigger?: React.ReactNode;
}

const REPORT_REASONS = [
  {
    value: 'fake_listing',
    label: 'Fake Listing / Misleading Information',
    description: 'The listing contains false or misleading details',
  },
  {
    value: 'inappropriate_photos',
    label: 'Inappropriate Photos',
    description: 'Photos that violate community guidelines',
  },
  {
    value: 'safety_concern',
    label: 'Safety Concern',
    description: 'Issues related to safety or security',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Any form of harassment or abusive behavior',
  },
  {
    value: 'spam_fraud',
    label: 'Spam / Fraud',
    description: 'Suspicious activity, spam, or potential fraud',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Any other issue not listed above',
  },
];

export default function ReportDialog({ targetId, targetType, trigger }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      toast.error('Please select a reason for your report');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Please provide a description (at least 10 characters)');
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = useAppStore.getState().currentUser;
      const res = await authFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUser?.id,
          targetId,
          targetType,
          reason: selectedReason,
          description: description.trim(),
          contactEmail: contactEmail || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit report');
      }
      setOpen(false);
      toast.success('Report submitted successfully. Our team will review within 24-48 hours.');
      setSelectedReason('');
      setDescription('');
      setContactEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReason, description, contactEmail, targetId, targetType]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form on close
      setSelectedReason('');
      setDescription('');
      setContactEmail('');
    }
  }, []);

  const targetLabel = targetType === 'PG' ? 'this PG' : targetType === 'USER' ? 'this user' : 'this review';

  const defaultTrigger = (
    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
      <Flag className="size-3" />
      Report
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-9 bg-red-100 rounded-lg flex items-center justify-center">
              <Flag className="size-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Report an Issue</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Help us keep the platform safe by reporting {targetLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-5 mt-2"
        >
          {/* Report Type Selector */}
          <motion.div variants={staggerItem} className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              What&apos;s the issue? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="space-y-2"
            >
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  htmlFor={`report-${reason.value}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedReason === reason.value
                      ? 'border-brand-teal bg-brand-teal/5'
                      : 'border-border hover:border-brand-teal/30 hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem
                    value={reason.value}
                    id={`report-${reason.value}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      selectedReason === reason.value
                        ? 'text-brand-teal'
                        : 'text-foreground'
                    }`}>
                      {reason.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reason.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </motion.div>

          <Separator />

          {/* Description */}
          <motion.div variants={staggerItem} className="space-y-2">
            <Label htmlFor="report-description" className="text-sm font-medium text-foreground">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail so our team can investigate..."
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </motion.div>

          {/* Contact Email (Optional) */}
          <motion.div variants={staggerItem} className="space-y-2">
            <Label htmlFor="report-email" className="text-sm font-medium text-foreground">
              Contact Email <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="report-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll use this to follow up if needed.
            </p>
          </motion.div>

          {/* Submit */}
          <motion.div variants={staggerItem} className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReason || !description.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 h-11 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit Report
                </>
              )}
            </Button>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <ShieldCheck className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your report will be reviewed by our moderation team within 24-48 hours.
                All reports are handled confidentially. False or malicious reports may result
                in action against your account.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
