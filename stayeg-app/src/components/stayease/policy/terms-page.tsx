'use client';

import { useState } from 'react';
import {
  ArrowLeft, FileText, Shield, Scale, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';

const TERMS_SECTIONS = [
  {
    number: '1',
    title: 'Acceptance of Terms',
    content: `By accessing or using StayEg ("the Platform"), operated by StayEg Technologies Private Limited, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree with any provision of these Terms, you must discontinue use of the Platform immediately.

StayEg reserves the right to amend these Terms at any time. Material changes will be communicated via email to your registered address or through an in-app notification at least 15 days before they take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms.

These Terms govern the use of the Platform by all categories of users, including tenants, PG owners, service vendors, and casual visitors.`,
  },
  {
    number: '2',
    title: 'User Accounts',
    content: `To use certain features of StayEg, you must create an account. You agree to:

• Provide accurate, current, and complete information during registration
• Maintain the security of your account credentials
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized access or security breach
• Keep your contact information up to date

You must be at least 18 years old to create an account. Users under 18 may use the Platform only with parental or guardian consent and supervision.

StayEg reserves the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activities.`,
  },
  {
    number: '3',
    title: 'PG Listings',
    content: `PG owners are solely responsible for the accuracy and completeness of all information provided in their property listings, including but not limited to:

• Property descriptions, amenities, and high-quality photographs that represent the current condition
• Pricing, real-time availability, and detailed room configurations
• Safety features and compliance with applicable local and state regulations
• Rules regarding gender preference, lifestyle, visitor policy, and house rules

StayEg conducts a physical verification of listed properties through its field team; however, StayEg acts as an intermediary platform and does not assume responsibility for the condition, safety, or legality of any individual PG. Listings found to contain materially misleading information will be removed, and the PG owner's account may be suspended or terminated.

PG owners must update their listings within 48 hours of any material change (price revision, amenity removal, rule change, etc.).`,
  },
  {
    number: '4',
    title: 'Bookings',
    content: `All bookings made through StayEg are subject to bed availability and confirmation by the PG owner. The booking workflow is as follows:

• The tenant selects a bed and submits a booking request along with personal details and payment
• Upon successful payment, the booking is confirmed instantly and a digital confirmation is generated
• The tenant may visit the PG within 48 hours of check-in; if the property materially differs from the listing, the tenant is entitled to a full refund

StayEg facilitates the booking process as an intermediary and is not a party to the landlord-tenant relationship. Disputes regarding bookings should first be raised through the in-app complaint system. If unresolved within 7 days, either party may request StayEg's formal mediation.

Cancellation of confirmed bookings is governed by the cancellation policy in Section 7.`,
  },
  {
    number: '5',
    title: 'Payments',
    content: `StayEg facilitates payments between tenants and PG owners through PCI-DSS Level 1 compliant payment gateways. Key payment terms:

• All transactions are processed in Indian Rupees (INR)
• StayEg charges a platform subscription fee to PG owners as specified on the Pricing page; tenants are not charged any booking or service fee
• Rent payments collected online are disbursed to PG owners within 2–3 business days
• Security deposits are held in a designated escrow account and released to the PG owner only upon confirmed tenant checkout
• Digital payment receipts are generated for every transaction and stored in the user's payment history

Users must not circumvent the Platform's payment system by making direct cash or bank transfers for stays sourced through StayEg. Doing so voids all platform protections, including dispute mediation and refund eligibility.`,
  },
  {
    number: '6',
    title: 'Refund Policy',
    content: `StayEg is committed to fair and transparent refund processes:

• Booking advance refunds: Full refund if cancelled within 24 hours of booking, 75% refund if cancelled 7+ days before check-in, no refund within 7 days of check-in
• Security deposit refunds: Processed within 7 business days of checkout, subject to deductions for damages or outstanding dues
• Subscription refunds: Available within 15 days of purchase with the money-back guarantee
• Processing time: Refunds take 5-10 business days to reflect in the original payment method

Refund requests can be submitted through the Platform or by contacting customer support.`,
  },
  {
    number: '7',
    title: 'Cancellation Policy',
    content: `For Tenants:
• Free cancellation within 24 hours of booking confirmation
• 75% refund if cancelled 7+ days before check-in date
• 50% refund if cancelled 3-7 days before check-in date
• No refund for cancellations within 3 days of check-in
• No-shows are charged the full advance amount

For PG Owners:
• Must honor confirmed bookings unless valid reason is provided
• Cancellation by owner after confirmation results in compensation to the tenant
• Repeated cancellations may result in listing removal and account penalties`,
  },
  {
    number: '8',
    title: 'Intellectual Property',
    content: `All content on StayEg, including but not limited to logos, text, graphics, images, code, and software, is the property of StayEg or its licensors and is protected by intellectual property laws.

Users retain ownership of content they upload (listings, reviews, photos). By uploading content, users grant StayEg a non-exclusive, royalty-free, worldwide license to use, display, and distribute that content on the Platform.

Users may not:
• Copy, modify, or distribute any part of the Platform without permission
• Use StayEg's trademarks, logos, or branding without written consent
• Scrape, crawl, or extract data from the Platform through automated means`,
  },
  {
    number: '9',
    title: 'Limitation of Liability',
    content: `StayEg acts as an intermediary platform and does not guarantee the quality, safety, legality, or habitability of any PG listing, vendor service, or user interaction.

To the maximum extent permitted by applicable Indian law:
• StayEg shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from or related to use of the Platform
• StayEg is not a party to the landlord-tenant relationship and is not responsible for disputes between users
• StayEg does not independently verify every claim made in user-submitted listings, reviews, or vendor profiles
• StayEg's total aggregate liability shall not exceed the platform fees paid by the claiming user in the 12 months preceding the claim

Users are strongly advised to visit the PG in person before making any payment, verify all claims independently, and read the rental agreement thoroughly before signing.`,
  },
  {
    number: '10',
    title: 'Dispute Resolution',
    content: `In case of any dispute arising from these Terms or use of the Platform:

1. Good Faith Resolution: Users should first attempt to resolve disputes directly with the other party
2. Platform Mediation: StayEg offers mediation support for unresolved disputes
3. Arbitration: If mediation fails, disputes shall be referred to binding arbitration in Bangalore, India
4. Governing Law: These Terms are governed by the laws of India
5. Jurisdiction: Courts in Bangalore, India shall have exclusive jurisdiction

The arbitration process shall be conducted in English, and each party shall bear their own costs unless the arbitrator determines otherwise.`,
  },
  {
    number: '11',
    title: 'Modifications',
    content: `StayEg reserves the right to modify these Terms at any time. Material changes will be communicated to users via:
• Email notification to registered addresses
• Platform notification banner
• In-app messaging

Users will be given at least 15 days' notice before material changes take effect. Continued use of the Platform after changes are effective constitutes acceptance of the modified Terms.

Users who do not agree with modifications may terminate their account before the changes take effect by contacting customer support.`,
  },
  {
    number: '12',
    title: 'Contact Information',
    content: `For any questions, legal notices, or concerns regarding these Terms of Service, please contact us:

StayEg Technologies Private Limited
3rd Floor, Innovation Hub, Koramangala
Bangalore 560034, Karnataka, India
Email: legal@stayeg.in
Phone: +91 80-4567-8900

Business Hours: Monday to Saturday, 9:00 AM – 6:00 PM IST
Response Time: We acknowledge all legal inquiries within 48 hours and provide a substantive response within 10 business days.`,
  },
];

export default function TermsPage() {
  const { setCurrentView } = useAppStore();
  const [activeSection, setActiveSection] = useState('1');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-br from-muted to-background border-b pt-8 pb-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => setCurrentView('LANDING')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-teal transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-brand-teal/15 flex items-center justify-center">
              <FileText className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Please read these terms carefully before using StayEg</p>
            </div>
          </div>

          <Badge variant="outline" className="mt-2 text-xs text-muted-foreground">
            Last Updated: April 2026
          </Badge>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Table of Contents - Desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
            <nav className="space-y-1">
              {TERMS_SECTIONS.map((section) => (
                <button
                  key={section.number}
                  onClick={() => scrollToSection(section.number)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeSection === section.number
                      ? 'bg-brand-teal/10 text-brand-teal font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-xs text-muted-foreground mr-1.5">{section.number}.</span>
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {TERMS_SECTIONS.map((section) => (
            <Card key={section.number} id={`section-${section.number}`} className="border-border scroll-mt-24">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-lg bg-brand-teal/15 text-brand-teal text-xs font-bold flex items-center justify-center">
                    {section.number}
                  </span>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('PRIVACY')}
              className="text-muted-foreground hover:text-brand-teal"
            >
              <Shield className="size-4 mr-2" />
              Privacy Policy
              <ChevronRight className="size-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('SAFE_USE')}
              className="text-muted-foreground hover:text-brand-teal"
            >
              Safe Use Guidelines
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
}
