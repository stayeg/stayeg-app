'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  CalendarCheck,
  Eye,
  CreditCard,
  MessageSquareWarning,
  LogOut,
  UserCog,
  ShieldAlert,
  Lightbulb,
  MapPin,
  Filter,
  Star,
  Tag,
  BadgeCheck,
  Clock,
  Receipt,
  Percent,
  AlertCircle,
  FileCheck,
  Bell,
  CheckCircle2,
  Upload,
  Phone,
  PhoneCall,
  Flame,
  Heart,
  Lock,
  Zap,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '@/lib/animations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuideStep {
  number: number;
  title: string;
  description: string;
}

interface GuideSection {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  steps: GuideStep[];
  tips: string[];
}

// ---------------------------------------------------------------------------
// 8 Tutorial Sections — fully detailed content
// ---------------------------------------------------------------------------

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'search-find-pg',
    icon: Search,
    title: 'How to Search & Find a PG',
    subtitle: 'Explore filters, city search, and amenities to discover your ideal accommodation.',
    steps: [
      {
        number: 1,
        title: 'Open the Explore Page',
        description:
          'Tap the "Explore" tab from the bottom navigation bar. You will see a curated list of PGs near your preferred location with photos, pricing, and availability badges.',
      },
      {
        number: 2,
        title: 'Use City & Locality Search',
        description:
          'Type your desired city or locality in the search bar (e.g., "Koramangala, Bangalore" or "Powai, Mumbai"). Results update in real time as you type, showing the closest matches first.',
      },
      {
        number: 3,
        title: 'Apply Smart Filters',
        description:
          'Use the filter panel to narrow down results. You can filter by budget range (₹3,000 – ₹25,000), room type (Single/Double/Triple/Dormitory), gender preference, meal plans (Veg/Non-Veg/Both), and amenities like WiFi, AC, Washing Machine, Parking, and more.',
      },
      {
        number: 4,
        title: 'Compare & Shortlist PGs',
        description:
          'Browse listings with detailed photos, verified owner info, tenant reviews, and ratings. Tap the heart icon to shortlist PGs you like — they are saved under your profile so you can compare later.',
      },
      {
        number: 5,
        title: 'View PG Details',
        description:
          'Tap any PG card to see the full listing: room photos, house rules, nearby landmarks, amenities list, pricing per bed type, and genuine tenant reviews. Check the "Verified" badge for properties inspected by the StayEg team.',
      },
    ],
    tips: [
      'Verified PGs undergo a physical inspection by the StayEg team — they are generally safer and more reliable.',
      'Sort results by "Nearest", "Lowest Price", or "Highest Rated" to quickly find what suits you.',
      'Enable location permissions to see PGs sorted by distance from your current position.',
    ],
  },
  {
    id: 'book-pg',
    icon: CalendarCheck,
    title: 'How to Book a PG',
    subtitle: 'Complete the booking flow with secure payment methods and redeem coupons.',
    steps: [
      {
        number: 1,
        title: 'Select Your Preferred Bed',
        description:
          'On the PG detail page, choose a room type (Single, Double, Triple, or Dormitory). Available beds are shown with a green "Available" badge. Occupied beds appear greyed out.',
      },
      {
        number: 2,
        title: 'Choose Your Move-in Date',
        description:
          'Tap "Book Now" and select your preferred check-in date from the calendar. The system shows the total rent for your first month, security deposit amount, and any applicable charges clearly before you proceed.',
      },
      {
        number: 3,
        title: 'Apply a Coupon (if available)',
        description:
          'Before paying, check if you have any active coupons in your account. Enter the coupon code in the "Apply Coupon" field — valid coupons automatically reduce your total. You can find coupons on the Payments page or through promotional notifications.',
      },
      {
        number: 4,
        title: 'Pay Securely',
        description:
          'Choose from multiple payment options: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Card (Visa, Mastercard, RuPay), or Net Banking. All payments are encrypted and processed through certified payment gateways.',
      },
      {
        number: 5,
        title: 'Confirm Your Booking',
        description:
          'After successful payment, you will receive a confirmation screen with your booking ID, PG name, room details, and move-in date. A confirmation is also sent to your registered email and phone number.',
      },
    ],
    tips: [
      'Book at least 3-5 days before your move-in date to allow time for the owner to prepare the room.',
      'Your security deposit is fully refundable at the time of move-out, subject to the PG\'s terms and any outstanding dues.',
      'If the booking is not confirmed within 24 hours (rare), your payment is automatically refunded.',
    ],
  },
  {
    id: 'view-stay-details',
    icon: Eye,
    title: 'How to View Your Stay Details',
    subtitle: 'Access your My Stay page for PG info, room details, and occupancy status.',
    steps: [
      {
        number: 1,
        title: 'Navigate to My Stay',
        description:
          'Tap the "My Stay" tab from the bottom navigation. This page is your personal dashboard for everything related to your current accommodation — available only when you have an active booking.',
      },
      {
        number: 2,
        title: 'View PG Information',
        description:
          'At the top, you will see your PG name, full address with a map pin, owner name, and the PG\'s contact details. The PG\'s overall rating and total reviews from tenants are also displayed here.',
      },
      {
        number: 3,
        title: 'Check Your Room Details',
        description:
          'Below the PG info, your specific room and bed details are shown: room type, bed number, monthly rent, deposit amount, and move-in date. You can also see if meals are included and the meal schedule.',
      },
      {
        number: 4,
        title: 'Review Your Booking Status',
        description:
          'Your booking status is prominently displayed — it can be "Pending" (awaiting owner confirmation), "Confirmed" (approved by owner), or "Active" (you have moved in). If a booking is cancelled or expired, the reason is shown.',
      },
      {
        number: 5,
        title: 'Access Quick Actions',
        description:
          'From the My Stay page, you can quickly navigate to pay rent, raise a complaint, contact your PG owner, or rate your stay. Quick-action cards are provided at the bottom for one-tap access.',
      },
    ],
    tips: [
      'If your booking status is "Pending" for more than 12 hours, you can message the PG owner directly to expedite confirmation.',
      'Screenshot your stay details for easy reference, especially when sharing your address with delivery services or visitors.',
      'The My Stay page refreshes automatically — pull down to manually refresh if needed.',
    ],
  },
  {
    id: 'pay-rent',
    icon: CreditCard,
    title: 'How to Pay Rent',
    subtitle: 'Pay on time using multiple methods, track due dates, download receipts, and apply coupons.',
    steps: [
      {
        number: 1,
        title: 'Go to the Payments Section',
        description:
          'From My Stay, tap the "Pay Rent" quick action, or navigate to the "Payments" page from the main menu. Here you can see your current month\'s rent, due date, and payment history.',
      },
      {
        number: 2,
        title: 'Check Due Date & Amount',
        description:
          'Your rent due date is typically the same date each month (e.g., 1st or 5th). The total amount, breakdown (rent + meals + utilities), and any pending dues from previous months are clearly listed.',
      },
      {
        number: 3,
        title: 'Choose a Payment Method',
        description:
          'Select your preferred method: UPI, Credit/Debit Card, or Net Banking. UPI payments are instant — your payment is confirmed within seconds. Card and Net Banking may take up to 5 minutes to reflect.',
      },
      {
        number: 4,
        title: 'Apply Coupons Before Paying',
        description:
          'If you have a valid coupon, click "Apply Coupon" before confirming payment. Coupons can offer flat discounts, percentage-offs, or cashback on your rent payment. Check the coupon\'s validity and terms before applying.',
      },
      {
        number: 5,
        title: 'Download Your Receipt',
        description:
          'After a successful payment, a digital receipt is generated automatically. You can view, download as PDF, or share it via WhatsApp/email. Receipts include the payment amount, date, transaction ID, and a breakdown of charges.',
      },
    ],
    tips: [
      'Set a recurring reminder in your phone\'s calendar for your rent due date so you never miss a payment.',
      'Late payments may attract a penalty fee as per your PG\'s policy — check the terms on your booking confirmation.',
      'Keep all receipts safely until your move-out for a smooth deposit refund process.',
    ],
  },
  {
    id: 'raise-complaints',
    icon: MessageSquareWarning,
    title: 'How to Raise Complaints',
    subtitle: 'Report issues by category and priority, then track resolution status in real time.',
    steps: [
      {
        number: 1,
        title: 'Navigate to the Complaints Section',
        description:
          'Tap the "Support" tab, then go to the "Complaints" tab. Here you can view all your existing complaints and their current status, or create a new one.',
      },
      {
        number: 2,
        title: 'Select the Complaint Category',
        description:
          'Choose the category that best describes your issue: Maintenance (plumbing, electrical, furniture), Cleanliness (room, common areas, bathrooms), Noise (disturbances from neighbors or surroundings), Safety (locks, lighting, security), Food (quality, timing, hygiene), or General/Other.',
      },
      {
        number: 3,
        title: 'Set the Priority Level',
        description:
          'Select the urgency: Low (minor inconvenience), Medium (affects daily routine), High (significant disruption — e.g., no water/electricity), or Urgent (safety risk or complete service failure). Higher-priority complaints are escalated faster.',
      },
      {
        number: 4,
        title: 'Describe the Issue Clearly',
        description:
          'Write a clear title and detailed description. Mention when the issue started, which area/room is affected, and any steps you have already taken. Attach photos if the app allows — this helps the owner or maintenance staff understand the problem quickly.',
      },
      {
        number: 5,
        title: 'Track Your Complaint Status',
        description:
          'After submission, your complaint goes through a status pipeline: Open → In Progress → Resolved → Closed. Each status change is timestamped, and you receive push notifications. You can add follow-up comments if the issue persists or escalate to StayEg support if unresolved for over 48 hours.',
      },
    ],
    tips: [
      'For maintenance issues, try to be specific: "Leaking tap in bathroom on 2nd floor" resolves faster than "Water issue".',
      'Use the "Urgent" priority sparingly — only for genuine safety concerns or total service failures to ensure fair treatment for all tenants.',
      'You can rate the resolution once a complaint is marked "Resolved" — this feedback helps improve service quality.',
    ],
  },
  {
    id: 'move-out',
    icon: LogOut,
    title: 'How to Move Out',
    subtitle: 'Follow the proper notice process, clear dues, and ensure a smooth deposit refund.',
    steps: [
      {
        number: 1,
        title: 'Review Your Notice Period',
        description:
          'Before initiating a move-out, check your booking details for the notice period requirement. Most PGs require 15-30 days written notice. The notice period is stated in your booking confirmation and the PG\'s house rules.',
      },
      {
        number: 2,
        title: 'Inform Your PG Owner',
        description:
          'Notify your PG owner via the app\'s "Contact Owner" feature or directly through WhatsApp/phone. Clearly state your intended last date of stay. It is best to do this in writing so there is a record.',
      },
      {
        number: 3,
        title: 'Clear All Pending Dues',
        description:
          'Go to the Payments section and ensure all rent, utility charges, and any outstanding fees are paid. Outstanding dues may be deducted from your security deposit, so settle everything before your last day.',
      },
      {
        number: 4,
        title: 'Hand Over Your Room',
        description:
          'On your move-out day, clean your room, return any provided items (keys, remote controls, appliances), and do a joint inspection with the PG owner or warden. Document the room condition with photos for your records.',
      },
      {
        number: 5,
        title: 'Receive Your Deposit Refund',
        description:
          'After the room inspection and due clearance, your security deposit is processed for refund. Refund timelines vary — most PGs process it within 7-15 business days. You will receive a refund confirmation and the amount via the same payment method used during booking. Track the refund status on the Payments page.',
      },
    ],
    tips: [
      'Always give notice in writing (app message or email) — verbal notice is harder to prove if there is a dispute.',
      'Take photos of the room condition at move-in and move-out to protect yourself from unfair damage claims.',
      'Keep all rent receipts and payment records until your deposit is fully refunded.',
    ],
  },
  {
    id: 'update-profile',
    icon: UserCog,
    title: 'How to Update Your Profile',
    subtitle: 'Complete KYC verification and keep your personal information accurate and up to date.',
    steps: [
      {
        number: 1,
        title: 'Access Your Profile Page',
        description:
          'Tap your avatar or name at the top of the home screen, or navigate to "Profile" from the main menu. Here you can view and edit all your personal details, KYC status, and account settings.',
      },
      {
        number: 2,
        title: 'Update Personal Information',
        description:
          'Edit your full name, phone number, email address, date of birth, gender, and emergency contact details. Keeping these accurate ensures smooth communication and booking confirmations.',
      },
      {
        number: 3,
        title: 'Complete KYC Verification',
        description:
          'KYC (Know Your Customer) verification is mandatory for booking a PG on StayEg. Navigate to the "KYC" section and upload clear photos or scans of your Aadhaar card (front and back) and PAN card. Ensure all details are legible and the images are not blurry.',
      },
      {
        number: 4,
        title: 'Wait for Verification',
        description:
          'After submitting your documents, the StayEg team verifies them within 24 hours. You will see a status indicator: "Pending" (yellow), "Verified" (green), or "Rejected" (red). If rejected, the reason is stated — fix the issue and re-upload.',
      },
      {
        number: 5,
        title: 'Manage Account Settings',
        description:
          'From the profile page, you can also change your password, update notification preferences, manage saved addresses, view your booking history, and delete your account if needed. Account deletion is permanent and removes all your data.',
      },
    ],
    tips: [
      'A verified KYC badge (green checkmark) on your profile increases your credibility with PG owners and speeds up booking approvals.',
      'Use a strong, unique password for your StayEg account and enable two-factor authentication if available.',
      'Update your emergency contact whenever there is a change — this information is critical in case of emergencies.',
    ],
  },
  {
    id: 'emergency-safety',
    icon: ShieldAlert,
    title: 'Emergency Contacts & Safety Tips',
    subtitle: 'Know what to do in emergencies and follow essential safety guidelines.',
    steps: [
      {
        number: 1,
        title: 'Use the Emergency SOS Button',
        description:
          'The Support page has a prominent red SOS button. Tapping it shows emergency instructions and one-tap calling for Police (100), Ambulance (108), Women Helpline (1091), and Fire Department (101). Use this in genuine emergencies only.',
      },
      {
        number: 2,
        title: 'Call Emergency Services Directly',
        description:
          'In life-threatening situations, call 100 (Police) or 108 (Ambulance) immediately — do not wait for the app. You can also tap the emergency contact cards on the Support page to call directly from your phone.',
      },
      {
        number: 3,
        title: 'Inform Your PG Owner or Warden',
        description:
          'After ensuring your immediate safety, inform your PG owner, warden, or a trusted neighbor. They can assist with building-specific protocols, evacuation procedures, or contacting local authorities.',
      },
      {
        number: 4,
        title: 'Report the Incident on StayEg',
        description:
          'Once you are safe, file a complaint on the app with "Safety" category and "Urgent" priority. Provide a factual description of what happened. This creates an official record and triggers a response from both the PG owner and the StayEg support team.',
      },
      {
        number: 5,
        title: 'Contact Family or Friends',
        description:
          'Reach out to a trusted family member or friend and let them know what happened and that you are safe. Share your PG\'s full address with at least two trusted contacts when you first move in.',
      },
    ],
    tips: [
      'Save emergency numbers (100, 108, 1091, 101) as speed-dial contacts on your phone for instant access.',
      'Familiarise yourself with emergency exits, fire extinguisher locations, and the nearest hospital when you move into a new PG.',
      'Always lock your room when stepping out, even briefly. Use a personal locker for valuables and important documents.',
      'Share your PG address and daily schedule with a trusted family member for added safety.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepCard({ step }: { step: GuideStep }) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex gap-3 sm:gap-4"
    >
      {/* Step number badge */}
      <div className="flex flex-col items-center shrink-0">
        <div className="size-8 sm:size-9 rounded-full bg-gradient-to-br from-brand-deep to-brand-teal text-white flex items-center justify-center text-sm font-bold shadow-sm">
          {step.number}
        </div>
        <div className="flex-1 w-px bg-gradient-to-b from-brand-teal/30 to-transparent mt-1" />
      </div>

      {/* Step content */}
      <div className="pb-5">
        <h4 className="text-sm font-semibold text-foreground leading-snug">
          {step.title}
        </h4>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

function TipItem({ tip, index }: { tip: string; index: number }) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex items-start gap-2.5"
    >
      <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
    </motion.div>
  );
}

function SectionContent({ section }: { section: GuideSection }) {
  const Icon = section.icon;

  return (
    <div className="space-y-5 pt-1">
      {/* Subtitle */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {section.subtitle}
      </p>

      <Separator />

      {/* Steps */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="size-4 text-brand-deep" />
          <h4 className="text-sm font-semibold text-foreground">Step-by-Step</h4>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-1"
        >
          {section.steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </motion.div>
      </div>

      <Separator />

      {/* Tips */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="size-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-foreground">Helpful Tips</h4>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/30"
        >
          {section.tips.map((tip, idx) => (
            <TipItem key={idx} tip={tip} index={idx} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TenantUserGuide() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['search-find-pg']);

  const handleValueChange = (value: string | undefined) => {
    setExpandedSections((prev) => {
      if (!value) return prev;
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
  };

  return (
    <section className="w-full" aria-label="Tenant User Guide">
      {/* ── Header ── */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="size-11 rounded-xl bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center shadow-sm">
            <BookOpen className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Tenant User Guide
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to know about using StayEg
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
      >
        {[
          { label: 'Sections', value: GUIDE_SECTIONS.length.toString(), icon: BookOpen, color: 'text-brand-deep', bg: 'bg-brand-deep/10' },
          { label: 'Total Steps', value: GUIDE_SECTIONS.reduce((sum, s) => sum + s.steps.length, 0).toString(), icon: ChevronRight, color: 'text-brand-teal', bg: 'bg-brand-teal/10' },
          { label: 'Helpful Tips', value: GUIDE_SECTIONS.reduce((sum, s) => sum + s.tips.length, 0).toString(), icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Avg. Read', value: '12 min', icon: Clock, color: 'text-brand-sage', bg: 'bg-brand-sage/10' },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <motion.div key={stat.label} variants={staggerItem}>
              <Card className="border shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`size-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                    <StatIcon className={`size-4 ${stat.color}`} />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Accordion Guide Sections ── */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
      >
        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0 sm:p-4">
            <Accordion
              type="multiple"
              value={expandedSections}
              onValueChange={handleValueChange}
              className="divide-y divide-border/50"
            >
              {GUIDE_SECTIONS.map((section, sectionIndex) => {
                const Icon = section.icon;
                const isOpen = expandedSections.includes(section.id);

                return (
                  <AccordionItem key={section.id} value={section.id} className="px-3 sm:px-4">
                    <AccordionTrigger className="hover:no-underline py-4 gap-3 group">
                      <div className="flex items-center gap-3 sm:gap-4 text-left">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                            isOpen
                              ? 'bg-gradient-to-br from-brand-deep to-brand-teal shadow-sm'
                              : 'bg-muted'
                          }`}
                        >
                          <Icon
                            className={`size-5 transition-colors duration-300 ${
                              isOpen ? 'text-white' : 'text-muted-foreground'
                            }`}
                          />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-semibold text-foreground">
                              {section.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-brand-teal/10 text-brand-teal border-brand-teal/20"
                            >
                              {section.steps.length} steps
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">
                            {section.subtitle}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <SectionContent section={section} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Bottom CTA ── */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Card className="border shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-brand-deep via-brand-teal to-brand-sage" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="size-12 rounded-xl bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center shrink-0 shadow-sm">
                <BadgeCheck className="size-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Still need help?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you couldn&apos;t find what you were looking for, reach out to our support team. We&apos;re available 24/7 to assist you with any questions or concerns.
                </p>
              </div>
              <Button
                className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white whitespace-nowrap shadow-sm"
              >
                <PhoneCall className="size-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
