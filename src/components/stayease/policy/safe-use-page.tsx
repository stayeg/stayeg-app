'use client';

import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle2, Users, Building2,
  Wrench, Phone, Flag, Heart, Eye, Lock, CreditCard, MessageSquare,
  ChefHat, FireExtinguisher, Siren, ChevronRight, FileText, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { CARD_BG, BADGE, BADGE_BORDER, TEXT_COLOR } from '@/lib/constants';

const TENANT_TIPS = [
  {
    icon: Eye,
    title: 'Visit the PG Before Paying',
    description: 'Always inspect the property in person before committing financially. Cross-check that the rooms, common areas, and amenities match the listing photographs and descriptions on StayEg. If the property materially differs, you are entitled to a full refund within 48 hours of check-in.',
    level: 'critical' as const,
  },
  {
    icon: Users,
    title: 'Meet the Owner or Manager',
    description: 'Have a face-to-face conversation with the PG owner or resident manager before signing any agreement. Verify their identity, discuss house rules, and clarify the notice period, visitor policy, and meal timings. Trust your instincts — if something feels off, walk away.',
    level: 'critical' as const,
  },
  {
    icon: CheckCircle2,
    title: 'Test Every Amenity Personally',
    description: 'Do not rely on the amenities list alone. Run a speed test on the Wi-Fi, check water pressure in the bathroom, inspect the mattress, verify that the AC or geyser works, and confirm that the kitchen is functional. Document any issues with photos and report them through StayEg\'s complaint system immediately.',
    level: 'high' as const,
  },
  {
    icon: CreditCard,
    title: 'Pay Only Through StayEg',
    description: 'Never transfer money directly to a personal bank account, UPI ID, or cash before the booking is confirmed on StayEg. All payments made through the platform are encrypted, receipted, and eligible for StayEg\'s dispute mediation and refund protection. Off-platform payments void these safeguards.',
    level: 'critical' as const,
  },
  {
    icon: Lock,
    title: 'Read the Rental Agreement',
    description: 'Before signing, read the agreement line by line. Pay attention to the notice period, lock-in duration, security deposit refund conditions, penalty clauses, and house rules. Ask for a copy of the signed agreement for your records. If any clause is unclear, seek clarification before committing.',
    level: 'high' as const,
  },
  {
    icon: MessageSquare,
    title: 'Keep All Communication on StayEg',
    description: 'Use StayEg\'s in-app messaging for all pre-booking and post-check-in communication with the PG owner. This creates a verifiable record that is invaluable if a dispute arises. WhatsApp and phone calls are useful, but always follow up with an in-app message summarising the conversation.',
    level: 'medium' as const,
  },
];

const OWNER_TIPS = [
  {
    icon: ShieldCheck,
    title: 'Mandate Tenant KYC',
    description: 'Require every tenant to complete StayEg\'s KYC verification (Aadhaar + PAN) before check-in. Collect a local emergency contact number and photograph. This protects you legally, reduces fraud risk, and creates a documented record for law enforcement if ever needed.',
    level: 'critical' as const,
  },
  {
    icon: CreditCard,
    title: 'Disclose All Charges Upfront',
    description: 'List every recurring and one-time charge on your StayEg listing — monthly rent, electricity, maintenance, meals, laundry, Wi-Fi, and the security deposit. Hidden charges are the number one source of negative reviews. Transparent pricing builds trust and reduces move-outs.',
    level: 'high' as const,
  },
  {
    icon: FireExtinguisher,
    title: 'Fire & Safety Compliance',
    description: 'Install and maintain fire extinguishers on every floor, functional smoke detectors, illuminated emergency exit signs, and CCTV at entry points. Conduct a fire drill at least once a quarter. Ensure your PG complies with your local municipal fire safety and building regulations.',
    level: 'critical' as const,
  },
  {
    icon: ChefHat,
    title: 'Maintain Hygiene Standards',
    description: 'Establish and enforce a daily cleaning schedule for rooms, bathrooms, common areas, and the kitchen. Contract a licensed pest control service every quarter. Food preparation areas must meet FSSAI norms. Tenants consistently rank cleanliness as their top priority — it directly impacts your reviews and occupancy.',
    level: 'high' as const,
  },
  {
    icon: Phone,
    title: 'Post Emergency Contacts',
    description: 'Display a laminated emergency contacts sheet in the lobby and every common area — local police (100), fire (101), ambulance (108), women\'s helpline (1091), the nearest hospital, and StayEg\'s 24/7 support line. Maintain a confidential register of every tenant\'s emergency contact person.',
    level: 'high' as const,
  },
  {
    icon: Users,
    title: 'Respect Tenant Privacy',
    description: 'Provide at least 24 hours\' notice before entering an occupied room (except in emergencies). Install individual room locks. Do not inspect personal belongings. A reputation for respecting privacy is one of the strongest drivers of positive word-of-mouth referrals.',
    level: 'medium' as const,
  },
];

const VENDOR_TIPS = [
  {
    icon: ShieldCheck,
    title: 'Complete Your Verification',
    description: 'Upload a valid government-issued ID, relevant trade certifications, and photographs of previous work to your StayEg vendor profile. A verified badge signals trustworthiness to PG owners and significantly increases your chances of winning service requests.',
    level: 'critical' as const,
  },
  {
    icon: CreditCard,
    title: 'Provide Written Quotes',
    description: 'Before beginning any work, share a detailed, itemised quote with the PG owner — covering labour, materials, timeline, and any potential additional costs. Avoid verbal-only agreements. Documented pricing eliminates disputes and builds a professional reputation.',
    level: 'high' as const,
  },
  {
    icon: CheckCircle2,
    title: 'Guarantee Your Work',
    description: 'Offer a minimum 30-day warranty on all repairs and installations. If an issue recurs within the warranty period, return and fix it at no additional charge. Standing behind your work is the single most effective way to earn repeat business and five-star reviews.',
    level: 'high' as const,
  },
  {
    icon: Phone,
    title: 'Communicate Professionally',
    description: 'Respond to service requests within 2 hours. Confirm your appointment time 24 hours before arrival. If you are running late, inform the PG owner immediately. After completing the job, send a brief summary of what was done and any follow-up recommendations.',
    level: 'medium' as const,
  },
];

const GENERAL_TIPS = [
  {
    icon: Flag,
    title: 'Report Fraudulent Activity',
    description: 'If you encounter a listing with doctored photographs, a user demanding off-platform payment, or any behaviour that violates StayEg\'s Terms of Service, report it immediately using the in-app reporting tool or email fraud@stayeg.in. Every report is investigated within 24 hours.',
    level: 'critical' as const,
  },
  {
    icon: Shield,
    title: 'Protect Your Account Credentials',
    description: 'StayEg will never ask for your OTP, password, PIN, or full bank details via phone, email, or chat. If anyone claiming to represent StayEg requests this information, it is a scam. Forward the communication to security@stayeg.in and change your password immediately.',
    level: 'critical' as const,
  },
  {
    icon: Heart,
    title: 'Treat Everyone with Respect',
    description: 'StayEg is a community platform. Discrimination, harassment, or hostile behaviour based on gender, religion, caste, sexual orientation, or region will result in immediate account suspension. We are committed to providing a safe and inclusive environment for every user.',
    level: 'medium' as const,
  },
];

const EMERGENCY_CONTACTS = [
  { name: 'Police', number: '100', icon: Siren, color: BADGE.red },
  { name: 'Fire Emergency', number: '101', icon: FireExtinguisher, color: BADGE.orange },
  { name: 'Ambulance', number: '108', icon: Heart, color: BADGE.pink },
  { name: 'Women Helpline', number: '1091', icon: Phone, color: BADGE.purple },
  { name: 'StayEg Support', number: '+91 80-4567-8900', icon: MessageSquare, color: 'text-brand-teal bg-brand-teal/10' },
];

const levelConfig = {
  critical: { bg: `${CARD_BG.red} border-red-200`, badge: 'bg-red-500 text-white', label: 'Critical' },
  high: { bg: `${CARD_BG.amber} border-amber-200`, badge: 'bg-amber-500 text-white', label: 'Important' },
  medium: { bg: `${CARD_BG.blue} border-blue-200`, badge: 'bg-blue-500 text-white', label: 'Recommended' },
};

function TipCard({ tip }: { tip: typeof TENANT_TIPS[0] }) {
  const Icon = tip.icon;
  const config = levelConfig[tip.level];

  return (
    <div className={`rounded-xl border p-4 ${config.bg} transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
          tip.level === 'critical' ? BADGE.red : tip.level === 'high' ? BADGE.amber : BADGE.blue
        }`}>
          <Icon className="size-4.5" />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-foreground">{tip.title}</h4>
            <Badge className={`${config.badge} text-[10px] px-1.5 py-0 border-0`}>{config.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{tip.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function SafeUsePage() {
  const { setCurrentView } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-br from-muted to-background border-b pt-8 pb-6">
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={() => setCurrentView('LANDING')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-teal transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className={`size-10 rounded-xl ${BADGE.green} flex items-center justify-center`}>
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Safe Use Guidelines</h1>
              <p className="text-sm text-muted-foreground">Practical safety guidelines for tenants, PG owners, and vendors on the StayEg platform</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Emergency Banner */}
        <Alert className={`${BADGE_BORDER.red} ${CARD_BG.red}`}>
          <Siren className="size-4" />
          <AlertTitle className={`${TEXT_COLOR.red} font-semibold`}>Emergency Contacts</AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
              {EMERGENCY_CONTACTS.map((contact) => {
                const Icon = contact.icon;
                return (
                  <div key={contact.name} className={`rounded-lg p-3 text-center ${contact.color}`}>
                    <Icon className="size-5 mx-auto mb-1.5" />
                    <p className="font-bold text-sm">{contact.number}</p>
                    <p className="text-xs opacity-80">{contact.name}</p>
                  </div>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>

        {/* For Tenants */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className={`size-8 rounded-lg ${BADGE.blue} flex items-center justify-center`}>
              <Users className="size-4" />
            </div>
            <h2 className="text-xl font-bold text-foreground">For Tenants</h2>
            <Badge className={`${BADGE.blue} border-0 text-xs ml-1`}>Finding & Staying Safe</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These guidelines help you stay safe and make informed decisions throughout your PG journey.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TENANT_TIPS.map((tip) => (
              <TipCard key={tip.title} tip={tip} />
            ))}
          </div>
        </section>

        <Separator />

        {/* For PG Owners */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
              <Building2 className="size-4 text-brand-teal" />
            </div>
            <h2 className="text-xl font-bold text-foreground">For PG Owners</h2>
            <Badge className="bg-brand-teal/15 text-brand-teal border-0 text-xs ml-1">Running a Safe PG</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Running a PG is a serious responsibility. These best practices protect your tenants, your reputation, and your business.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OWNER_TIPS.map((tip) => (
              <TipCard key={tip.title} tip={tip} />
            ))}
          </div>
        </section>

        <Separator />

        {/* For Vendors */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-lg bg-brand-sage/15 flex items-center justify-center">
              <Wrench className="size-4 text-brand-sage" />
            </div>
            <h2 className="text-xl font-bold text-foreground">For Vendors</h2>
            <Badge className="bg-brand-sage/15 text-brand-sage border-0 text-xs ml-1">Professional Service</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Build trust and grow your business by following these guidelines.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VENDOR_TIPS.map((tip) => (
              <TipCard key={tip.title} tip={tip} />
            ))}
          </div>
        </section>

        <Separator />

        {/* General Safety */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className={`size-8 rounded-lg ${BADGE.green} flex items-center justify-center`}>
              <Shield className="size-4" />
            </div>
            <h2 className="text-xl font-bold text-foreground">General Safety</h2>
            <Badge className={`${BADGE.green} border-0 text-xs ml-1`}>Everyone</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GENERAL_TIPS.map((tip) => (
              <TipCard key={tip.title} tip={tip} />
            ))}
          </div>
        </section>

        {/* Report Section */}
        <Card className="border-brand-teal/20 bg-gradient-to-br from-brand-teal/10 to-background overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-brand-teal/15 flex items-center justify-center shrink-0">
                <Flag className="size-6 text-brand-teal" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">See Something Suspicious?</h3>
                <p className="text-sm text-muted-foreground">
                  If you encounter fraudulent listings, suspicious behaviour, or any activity that violates StayEg's policies, report it immediately. Every report is investigated confidentially, and we take enforcement action within 48 hours for verified violations.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white text-sm"
                    onClick={() => {
                      const { showToast } = useAppStore.getState();
                      showToast('Report submitted! We will investigate promptly.');
                    }}
                  >
                    <Flag className="size-4 mr-2" />
                    Report an Issue
                  </Button>
                  <Button variant="outline" className="text-sm" onClick={() => { setCurrentView('LANDING'); const { showToast } = useAppStore.getState(); showToast('Support feature coming soon!'); }}>
                    <MessageSquare className="size-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('TERMS')}
            className="text-muted-foreground hover:text-brand-teal"
          >
            <FileText className="size-4 mr-2" />
            Terms of Service
            <ChevronRight className="size-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('PRIVACY')}
            className="text-muted-foreground hover:text-brand-teal"
          >
            Privacy Policy
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
}
