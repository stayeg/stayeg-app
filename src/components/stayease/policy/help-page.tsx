'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  HelpCircle,
  Search,
  MessageSquare,
  AlertTriangle,
  BookOpen,
  UserPlus,
  Users,
  Building2,
  Wrench,
  ShieldCheck,
  CreditCard,
  FileText,
  Lock,
  ChevronRight,
  Mail,
  Phone,
  Headphones,
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

function StaggerContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  {
    icon: Search,
    title: 'Browse PGs',
    description: 'Explore verified PG listings across 20+ cities in India.',
    action: 'PG_LISTING' as const,
    color: 'bg-brand-teal/15 text-brand-teal',
    hoverBorder: 'hover:border-brand-teal/30',
  },
  {
    icon: MessageSquare,
    title: 'Contact Support',
    description: 'Get in touch with our team for assistance.',
    action: 'SUPPORT_TOAST' as const,
    color: 'bg-brand-deep-light text-brand-deep',
    hoverBorder: 'hover:border-brand-deep/30',
  },
  {
    icon: AlertTriangle,
    title: 'Report an Issue',
    description: 'Flag safety concerns, fraudulent activity, or bugs.',
    action: 'SAFE_USE' as const,
    color: 'bg-destructive/15 text-destructive',
    hoverBorder: 'hover:border-destructive/30',
  },
  {
    icon: BookOpen,
    title: 'Read Guidelines',
    description: 'Learn about safety tips and platform best practices.',
    action: 'SAFE_USE' as const,
    color: 'bg-brand-sage/15 text-brand-sage',
    hoverBorder: 'hover:border-brand-sage/30',
  },
];

const GETTING_STARTED_STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: 'Create Your Account',
    description:
      'Sign up with your email or phone number and complete a quick profile setup. Choose your role as Tenant, PG Owner, or Vendor so the platform can tailor the experience to your needs. Login securely with OTP or password anytime.',
    color: 'bg-brand-teal/15 text-brand-teal',
    accent: 'text-brand-teal',
  },
  {
    step: 2,
    icon: Users,
    title: 'For Tenants',
    description:
      'Search for PGs by city, locality, gender preference, budget, and amenities. View detailed listings with real photos, verified reviews, and transparent pricing. Select a bed, book instantly, and pay securely through the platform. Track bookings and raise complaints if needed.',
    color: 'bg-brand-teal/15 text-brand-teal',
    accent: 'text-brand-teal',
  },
  {
    step: 3,
    icon: Building2,
    title: 'For PG Owners',
    description:
      'List your PG property with room configurations, bed types, amenities, and pricing. Add rooms and beds, manage tenant check-ins, track rent collection with automated reminders, and monitor occupancy analytics. Register vendors and staff to streamline operations.',
    color: 'bg-brand-sage/15 text-brand-sage',
    accent: 'text-brand-sage',
  },
  {
    step: 4,
    icon: Wrench,
    title: 'For Vendors',
    description:
      'Register as a service provider (plumber, electrician, cleaner, or more) to get leads from PG owners in your area. List your services, set availability, receive job requests, and build a reputation through reviews and ratings.',
    color: 'bg-brand-deep-light text-brand-deep',
    accent: 'text-brand-deep',
  },
];

const TENANT_FAQ = [
  {
    question: 'How do I find a PG on StayEg?',
    answer:
      'Use the search bar on the homepage or navigate to the Explore page. Filter by city, locality, gender preference (Male, Female, Unisex), monthly budget, amenities (Wi-Fi, AC, meals, laundry), and user rating. Each listing includes real photographs, verified reviews from current tenants, and a detailed amenities list. Click on any PG card to view room configurations and transparent pricing.',
  },
  {
    question: 'How do I book a room?',
    answer:
      'On the PG detail page, select an available bed from the room options, then click "Book Now." You will be guided through a 3-step process: (1) confirm the bed and PG details, (2) fill in your personal information and upload a profile photo, and (3) review the cost breakdown and pay securely. You can apply a coupon code at the payment step for discounts. A confirmed booking appears instantly in "My Bookings."',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'StayEg supports UPI (Google Pay, PhonePe, Paytm), credit and debit cards (Visa, Mastercard, RuPay), net banking from all major Indian banks, and digital wallets. All transactions are processed through PCI-DSS Level 1 compliant payment gateways. You can save preferred payment methods for one-tap future payments.',
  },
  {
    question: 'How do I file a complaint?',
    answer:
      'Navigate to "My Bookings," select the relevant booking, and click "Raise Complaint." Describe the issue, attach photos if applicable, and set the priority level (Low, Medium, High, Critical). The PG owner receives an instant notification and can respond with status updates. You can track the resolution timeline in real time and escalate if needed.',
  },
  {
    question: 'How does KYC verification work?',
    answer:
      'Go to your Profile page and tap "Start KYC Verification." Upload clear images of your Aadhaar card (front and back) and PAN card. StayEg\'s system auto-extracts the details and cross-verifies them against your profile. Verification typically completes within 24 hours. KYC is mandatory before you can make a booking or payment — this protects both you and the PG owner.',
  },
  {
    question: 'Can I cancel my booking?',
    answer:
      'Yes. Go to "My Bookings," select the booking, and choose "Cancel Booking." The refund depends on timing: full refund (minus processing fee) if cancelled 48+ hours before check-in, 75% refund if cancelled 24–48 hours before, and no refund within 24 hours. The specific policy for each PG is displayed on the listing page before you book.',
  },
  {
    question: 'Is my personal information safe on StayEg?',
    answer:
      'Absolutely. StayEg uses 256-bit SSL encryption, bcrypt-hashed passwords, and role-based access controls. Your Aadhaar and PAN details are stored in encrypted format and are visible only to our verification team — never to other users or PG owners. We comply with India\'s Digital Personal Data Protection Act (DPDPA) and conduct regular security audits.',
  },
  {
    question: 'Can I switch PGs during my stay?',
    answer:
      'Yes, you can initiate a PG transfer from "My Bookings." Check the current PG\'s notice period (typically 15–30 days), raise a formal move-out notice, and then search and book your next PG on StayEg. Your KYC is already verified, so the second booking is faster. Security deposit settlement from the current PG is handled as per its listed policy.',
  },
];

const OWNER_FAQ = [
  {
    question: 'How do I list my PG on StayEg?',
    answer:
      'From your owner dashboard, click "My PGs" then "Add New PG." Fill in the property name, full address, gender type (Male, Female, Unisex), a detailed description, and all available amenities. Upload at least 5 high-resolution photographs covering the building exterior, rooms, common areas, and kitchen. Configure rooms with bed types and monthly pricing. Your listing goes live after our field team completes a quick review.',
  },
  {
    question: 'How does rent collection work?',
    answer:
      'The rent management module displays every tenant\'s payment status on a single dashboard. Set monthly rent per bed, track overdue amounts, and send automated reminders via in-app notification and WhatsApp. Record payments received both online and offline. The system generates downloadable receipts for every transaction and maintains a complete audit trail.',
  },
  {
    question: 'How do I manage my staff?',
    answer:
      'Navigate to "Staff Management" from the owner dashboard. Add each staff member with their full name, role (cook, cleaner, security guard, warden, etc.), phone number, and assigned shift (Morning, Evening, Night). The shift scheduler ensures no gaps in coverage. Update roles, deactivate departed staff, and maintain a single source of truth for your workforce.',
  },
  {
    question: 'How do vendor services work?',
    answer:
      'StayEg\'s vendor marketplace connects you with pre-verified service providers — plumbers, electricians, carpenters, painters, pest control, and more. Browse by service type and area, review ratings from other PG owners, and connect directly. For recurring maintenance, you can assign a vendor to a specific PG so they are always a tap away.',
  },
  {
    question: 'What analytics and reports are available?',
    answer:
      'The owner analytics dashboard provides real-time visibility into occupancy rates, monthly revenue, booking trends, complaint resolution times, and tenant feedback scores. Visual charts break down data by PG, by month, and by revenue stream. Export reports as CSV for accounting or investor updates.',
  },
  {
    question: 'What subscription plans are available for PG owners?',
    answer:
      'StayEg offers three plans: Starter (1 year), Growth (2 years), and Enterprise (3 years). Longer commitments provide a lower effective monthly cost. All plans include unlimited PG listings, full tenant management, automated rent tracking, staff scheduling, vendor access, and priority support. Visit the Pricing page for a detailed feature comparison and current promotional offers.',
  },
];

const PAYMENT_FAQ = [
  {
    question: 'Is my payment secure?',
    answer:
      'Every transaction on StayEg is processed through PCI-DSS Level 1 compliant payment gateways with 256-bit SSL encryption. StayEg does not store your full card details on its servers. Each payment generates a digital receipt stored in your payment history, and the entire transaction trail is auditable. If you ever notice an unauthorised charge, contact support@stayeg.in immediately.',
  },
  {
    question: 'How do coupons work?',
    answer:
      'During the payment step of a booking, enter the coupon code in the "Apply Coupon" field. The discount is reflected instantly in your cost breakdown. Coupons may be flat-amount or percentage-based, and some require a minimum booking value. Browse active coupons in the "Coupon Wallet" section. Each coupon has a clearly stated validity period and usage conditions.',
  },
  {
    question: 'What is the security deposit?',
    answer:
      'The security deposit is a refundable amount — typically equal to one or two months\' rent — collected at the time of booking. It is held separately from your monthly rent and covers potential damages or outstanding dues. The exact amount is clearly displayed on each PG\'s listing page. When you vacate, the PG owner inspects the room and initiates the refund within 7 business days.',
  },
  {
    question: 'How do I get a refund?',
    answer:
      'For booking cancellations, go to "My Bookings," select the booking, and tap "Cancel." If you are eligible for a refund (per the cancellation policy), it is automatically initiated to your original payment method within 5–7 business days. For security deposit refunds, the PG owner initiates the process after checkout inspection. If you face delays, email support@stayeg.in with your booking ID.',
  },
  {
    question: 'Are there any hidden charges?',
    answer:
      'No. StayEg is free for tenants — there are no booking fees, service charges, or convenience fees. The price shown on the listing page is the monthly rent you pay. Any applicable security deposit is stated upfront before you confirm the booking. PG owners pay a disclosed platform subscription fee; tenants are never charged.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HelpPage() {
  const { setCurrentView, showToast } = useAppStore();

  function handleAction(action: string) {
    if (action === 'SUPPORT_TOAST') {
      showToast('Support feature coming soon!');
      return;
    }
    setCurrentView(action as 'PG_LISTING' | 'SAFE_USE' | 'LANDING');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================================ */}
      {/*  1. Header                                                    */}
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
              <HelpCircle className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Help &amp; Support</h1>
              <p className="text-sm text-muted-foreground">Answers to common questions, step-by-step guides, and support channels</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ============================================================ */}
        {/*  2. Quick Actions                                            */}
        {/* ============================================================ */}
        <FadeIn>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className={`border-border ${item.hoverBorder} transition-colors cursor-pointer group`}
                    onClick={() => handleAction(item.action)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className={`size-10 rounded-xl ${item.color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed hidden sm:block">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </FadeIn>

        <Separator />

        {/* ============================================================ */}
        {/*  3. Getting Started Guide                                    */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-deep-light flex items-center justify-center">
                <BookOpen className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Getting Started Guide</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Whether you are a tenant, PG owner, or service vendor — here is how to get started on StayEg.
            </p>
          </FadeIn>

          <div className="space-y-4">
            {GETTING_STARTED_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.step} delay={i * 0.1}>
                  <Card className="border-border hover:border-brand-teal/20 transition-colors">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <div className={`size-11 rounded-xl ${step.color} flex items-center justify-center`}>
                            <Icon className="size-5" />
                          </div>
                          <div className={`text-center mt-1.5 text-xs font-bold ${step.accent}`}>
                            Step {step.step}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  4. Tenant FAQ                                               */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
                <Users className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Tenant FAQ</h2>
              <Badge className="bg-brand-teal/15 text-brand-teal border-0 text-xs ml-1">
                {TENANT_FAQ.length} questions
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Everything tenants need to know — from searching and booking to payments and transfers.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {TENANT_FAQ.map((item, i) => (
                    <AccordionItem key={i} value={`tenant-${i}`} className="px-5 sm:px-6">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:text-brand-teal transition-colors">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  5. Owner FAQ                                                */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-teal/15 flex items-center justify-center">
                <Building2 className="size-4 text-brand-teal" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">PG Owner FAQ</h2>
              <Badge className="bg-brand-teal/15 text-brand-teal border-0 text-xs ml-1">
                {OWNER_FAQ.length} questions
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Listing properties, managing tenants, collecting rent, and using analytics.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {OWNER_FAQ.map((item, i) => (
                    <AccordionItem key={i} value={`owner-${i}`} className="px-5 sm:px-6">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:text-brand-teal transition-colors">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  6. Payment & Billing FAQ                                    */}
        {/* ============================================================ */}
        <section>
          <FadeIn>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-brand-sage/15 flex items-center justify-center">
                <CreditCard className="size-4 text-brand-sage" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Payment &amp; Billing FAQ</h2>
              <Badge className="bg-brand-sage/15 text-brand-sage border-0 text-xs ml-1">
                {PAYMENT_FAQ.length} questions
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Payment security, refund timelines, coupon usage, and deposit policies.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="border-border">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {PAYMENT_FAQ.map((item, i) => (
                    <AccordionItem key={i} value={`payment-${i}`} className="px-5 sm:px-6">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:text-brand-teal transition-colors">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  7. Still Need Help?                                         */}
        {/* ============================================================ */}
        <FadeIn>
          <Card className="border-brand-teal/20 bg-gradient-to-br from-brand-teal/10 via-brand-sage/5 to-background overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="size-14 rounded-2xl bg-brand-teal/15 flex items-center justify-center shrink-0">
                  <Headphones className="size-7 text-brand-teal" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Still Need Help?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our support team is available Monday to Saturday, 9:00 AM to 6:00 PM IST.
                      For urgent safety concerns, our emergency helpline operates 24/7.
                      Reach out through any channel below and we typically respond within 2 hours during business hours.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
                        <Mail className="size-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Email</p>
                        <p className="text-sm text-foreground truncate">support@stayeg.in</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="size-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
                        <Phone className="size-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Phone</p>
                        <p className="text-sm text-foreground">+91 80-4567-8900</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white text-sm"
                      onClick={() => showToast('Support feature coming soon!')}
                    >
                      <Headphones className="size-4 mr-2" />
                      Contact Us
                    </Button>
                    <Button
                      variant="outline"
                      className="text-sm"
                      onClick={() => setCurrentView('SAFE_USE')}
                    >
                      <FileText className="size-4 mr-2" />
                      Read Safety Guidelines
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('SAFE_USE')}
            className="text-muted-foreground hover:text-brand-teal text-sm"
          >
            <ShieldCheck className="size-4 mr-2" />
            Safe Use Guidelines
            <ChevronRight className="size-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('ABOUT')}
            className="text-muted-foreground hover:text-brand-teal text-sm"
          >
            About StayEg
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Mobile bottom spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
