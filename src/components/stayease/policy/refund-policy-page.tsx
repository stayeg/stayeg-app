'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Clock,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  IndianRupee,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useAppStore } from '@/store/use-app-store';
import { BADGE } from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const REFUND_TIERS = [
  {
    tier: 'Full Refund',
    badge: BADGE.green,
    timeframe: 'Cancelled 7+ days before check-in',
    percentage: '100%',
    description: 'Complete refund of booking advance (minus a ₹99 processing fee). Refund is initiated automatically and credited to the original payment method within 5–7 business days.',
  },
  {
    tier: 'Partial Refund',
    badge: BADGE.yellow,
    timeframe: 'Cancelled 3–7 days before check-in',
    percentage: '50%',
    description: 'Half of the booking advance is refunded to the original payment method within 5–7 business days. The processing fee is deducted from the refund amount.',
  },
  {
    tier: 'No Refund',
    badge: BADGE.red,
    timeframe: 'Cancelled within 3 days of check-in',
    percentage: '0%',
    description: 'The booking advance is forfeited. No-shows are also charged the full advance amount. Exceptions may be considered for medical emergencies with valid documentation.',
  },
];

const DEPOSIT_STEPS = [
  { step: 1, text: 'Tenant raises a checkout request through the app at least 15 days before the intended move-out date.' },
  { step: 2, text: 'PG owner conducts a room inspection within 3 business days of the checkout date.' },
  { step: 3, text: 'Any deductions for damages, pending rent, or outstanding dues are documented and shared with the tenant.' },
  { step: 4, text: 'Refund amount is calculated: Security Deposit – Deductions = Refundable Amount.' },
  { step: 5, text: 'Refund is processed within 7 business days of checkout and credited to the original payment method.' },
];

const SUBSCRIPTION_REFUND = [
  { plan: 'Within 15 days of purchase', refund: 'Full refund of the subscription fee (no questions asked money-back guarantee)' },
  { plan: 'After 15 days but within 3 months', refund: 'Pro-rated refund for unused months minus a 10% early termination fee' },
  { plan: 'After 3 months', refund: 'No refund is available. The subscription remains active until the end of the billing period.' },
];

const IMPORTANT_NOTES = [
  'All refunds are processed to the original payment method used at the time of booking or purchase. StayEg does not issue refunds to alternative accounts or payment methods.',
  'Refund processing times are 5–7 business days for UPI and cards, and 7–10 business days for net banking. Bank holidays may cause additional delays.',
  'In case of disputes between tenant and PG owner regarding deductions, StayEg offers mediation support. Both parties must submit evidence within 7 days of the dispute being raised.',
  'Fraudulent refund requests or misrepresentation of facts will result in account suspension and may attract legal action.',
  'StayEg is not liable for delays caused by payment gateway outages, bank processing times, or force majeure events.',
  'For any refund-related queries not addressed in this policy, please contact support@stayeg.in with your booking ID or transaction reference number.',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function RefundPolicyPage() {
  const { setCurrentView } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================================ */}
      {/*  Header                                                      */}
      {/* ============================================================ */}
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
            <div className="size-10 rounded-xl bg-brand-teal/15 flex items-center justify-center">
              <RotateCcw className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Refund Policy</h1>
              <p className="text-sm text-muted-foreground">Clear, fair, and transparent refund processes for all users</p>
            </div>
          </div>

          <Badge variant="outline" className="mt-2 text-xs text-muted-foreground">
            Last Updated: April 2026
          </Badge>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ============================================================ */}
        {/*  Booking Cancellation Policy                                 */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
                <CreditCard className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Booking Cancellation Policy</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              When you cancel a confirmed booking, the refund amount depends on how far in advance you cancel. 
              The policy below applies to all standard bookings unless the PG listing specifies otherwise.
            </p>
          </FadeIn>

          <div className="space-y-4">
            {REFUND_TIERS.map((tier, i) => (
              <FadeIn key={tier.tier} delay={i * 0.1}>
                <Card className="border-border hover:border-brand-teal/20 transition-colors">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="shrink-0">
                        <Badge className={`${tier.badge} text-xs font-semibold border-0`}>
                          {tier.tier}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-2xl font-bold text-foreground">{tier.percentage}</span>
                          <span className="text-sm text-muted-foreground">refund</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{tier.timeframe}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  Security Deposit Refund                                      */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
                <ShieldCheck className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Security Deposit Refund</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              The security deposit is a refundable amount collected at the time of booking. It is held in a 
              designated escrow account and refunded upon checkout, subject to any applicable deductions.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Refund Process</h3>
                <div className="relative space-y-4 ml-2 sm:ml-4 border-l-2 border-brand-teal/20 pl-4 sm:pl-6">
                  {DEPOSIT_STEPS.map((item, i) => (
                    <div key={item.step} className="relative">
                      <div className="absolute -left-[calc(0.75rem+4px)] sm:-left-[calc(1.25rem+4px)] top-0.5 size-3 rounded-full bg-brand-teal ring-4 ring-background" />
                      <div className="flex items-start gap-3">
                        <span className="size-6 rounded-full bg-brand-teal/15 text-brand-teal text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {item.step}
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Possible Deductions</h4>
                  <ul className="space-y-1.5">
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <IndianRupee className="size-3.5 mt-1 shrink-0 text-muted-foreground" />
                      Outstanding rent or utility charges
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <IndianRupee className="size-3.5 mt-1 shrink-0 text-muted-foreground" />
                      Cost of repair for damages beyond normal wear and tear
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <IndianRupee className="size-3.5 mt-1 shrink-0 text-muted-foreground" />
                      Replacement cost for lost or unreturned items (keys, appliances, etc.)
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <IndianRupee className="size-3.5 mt-1 shrink-0 text-muted-foreground" />
                      Cleaning charges if the room is left in an unreasonable condition
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  Payment Failure Refunds                                      */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-sage/15 flex items-center justify-center">
                <AlertTriangle className="size-4 text-brand-sage" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Payment Failure Refunds</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-5 sm:p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="auto-retry" className="px-0">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:text-brand-teal transition-colors">
                      Automatic Retry
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      If a payment fails due to a temporary issue (network timeout, bank server down), the payment 
                      gateway automatically retries the transaction up to 2 times within 15 minutes. No additional 
                      amount is charged during this process. You will receive a real-time notification about the retry status.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="manual-refund" className="px-0">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:text-brand-teal transition-colors">
                      Manual Refund Request
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      If an amount was debited from your account but the booking was not confirmed (i.e., the payment 
                      was successful on your end but failed on StayEg&apos;s server), the amount is automatically reversed 
                      within 3–5 business days by the payment gateway. If the amount is not reversed within 7 business 
                      days, email us at support@stayeg.in with your transaction ID and we will initiate a manual refund 
                      within 24 hours.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="double-charge" className="px-0">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:text-brand-teal transition-colors">
                      Duplicate Charges
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      In rare cases where the same amount is charged twice for a single transaction, the duplicate charge 
                      is automatically detected and reversed within 2–3 business days. If not, contact support with both 
                      transaction IDs and we will process the refund immediately.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  Subscription Refund Policy                                   */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-deep-light flex items-center justify-center">
                <FileText className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Subscription Refund Policy <span className="text-sm font-normal text-muted-foreground">(For PG Owners)</span></h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              PG owner subscription fees follow a tiered refund policy based on the time of cancellation request.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-5 sm:p-6">
                <div className="space-y-4">
                  {SUBSCRIPTION_REFUND.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="size-4 text-brand-teal" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.plan}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.refund}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <p className="text-xs text-muted-foreground leading-relaxed">
                  To request a subscription refund, navigate to your owner dashboard &gt; Settings &gt; Manage 
                  Subscription &gt; Request Cancellation. Our team will review and process the refund within 7 business days.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  How to Request a Refund                                      */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
                <HelpCircle className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">How to Request a Refund</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-5 sm:p-6">
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Open My Bookings', desc: 'Go to the "My Bookings" section from the main menu or profile page.' },
                    { step: '2', title: 'Select the Booking', desc: 'Find the relevant booking and tap to view its details.' },
                    { step: '3', title: 'Initiate Cancellation', desc: 'Click "Cancel Booking" and confirm the cancellation reason. The eligible refund amount will be displayed.' },
                    { step: '4', title: 'Confirm & Submit', desc: 'Review the refund details and click "Confirm Cancellation." A confirmation email with refund details will be sent to your registered email.' },
                    { step: '5', title: 'Track Refund Status', desc: 'Monitor your refund status in "My Bookings" or in the Payment History section. You will also receive email updates at each stage.' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="size-7 rounded-full bg-brand-teal/15 text-brand-teal text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  Important Notes                                              */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-sage/15 flex items-center justify-center">
                <AlertTriangle className="size-4 text-brand-sage" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Important Notes</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-5 sm:p-6">
                <ul className="space-y-3">
                  {IMPORTANT_NOTES.map((note, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="size-4 text-brand-teal shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{note}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        {/* ============================================================ */}
        {/*  Contact Refund Support                                       */}
        {/* ============================================================ */}
        <FadeIn>
          <Card className="border-brand-teal/20 bg-gradient-to-br from-brand-teal/10 via-brand-sage/5 to-background">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="size-12 rounded-2xl bg-brand-teal/15 flex items-center justify-center shrink-0">
                <RotateCcw className="size-6 text-brand-teal" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-semibold text-foreground mb-1">Refund Taking Longer Than Expected?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact our support team with your booking ID or transaction reference number for immediate assistance.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setCurrentView('CONTACT')}
              >
                <RotateCcw className="size-4 mr-2" />
                Contact Support
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('HELP')}
            className="text-muted-foreground hover:text-brand-teal text-sm"
          >
            <HelpCircle className="size-4 mr-2" />
            Help Center
            <ChevronRight className="size-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('TERMS')}
            className="text-muted-foreground hover:text-brand-teal text-sm"
          >
            Terms of Service
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Mobile bottom spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
