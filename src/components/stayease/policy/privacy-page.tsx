'use client';

import { useState } from 'react';
import {
  ArrowLeft, Shield, Lock, Database, Eye, Cookie,
  UserCheck, Baby, Globe, RefreshCw, ChevronRight, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/use-app-store';
import { BADGE } from '@/lib/constants';

const PRIVACY_SECTIONS = [
  {
    number: '1',
    title: 'Information We Collect',
    icon: Database,
    content: `At StayEg, we collect information solely to provide, secure, and improve our platform. The categories of data we collect are:

Personal Information:
• Full name, email address, mobile number, and date of birth
• Government-issued ID numbers (Aadhaar, PAN) — collected only for KYC verification and stored in encrypted format
• Profile photograph, bio, city, age, and occupation

Property Information (PG Owners):
• Property address, geo-coordinates, photographs, and written descriptions
• Room configurations, amenity list, pricing, and occupancy rules
• Safety compliance documents and local registration certificates

Usage Information:
• Device information (IP address, browser type, operating system, device model)
• Pages visited, features used, search queries, and interaction patterns
• Precise location data — collected only with your explicit consent for nearby-services features

Financial Information:
• Payment instrument details are tokenised and processed by our PCI-DSS compliant payment partner; StayEg does not store full card numbers
• Transaction history, digital receipts, and billing records are retained for 7 years as required by Indian tax law`,
  },
  {
    number: '2',
    title: 'How We Use Your Information',
    icon: Eye,
    content: `We use collected data strictly for the purposes outlined below:

Core Service Delivery:
• Account creation, authentication, and profile management
• Facilitating PG discovery, bookings, payments, and complaint resolution
• Verifying user identity through our KYC system
• Providing customer support and mediating disputes between users

Platform Improvement:
• Analysing anonymised usage patterns to improve features and performance
• Personalising PG recommendations based on your stated preferences and search behaviour
• Developing new features and services based on aggregate demand signals

Communication:
• Transactional messages: booking confirmations, payment receipts, rent reminders, and complaint updates
• Service announcements: planned maintenance, policy changes, or security advisories
• Marketing communications: sent only if you have explicitly opted in; you can unsubscribe at any time from your profile settings

Safety, Security & Compliance:
• Detecting and preventing fraud, fake listings, and unauthorised account access
• Enforcing our Terms of Service and community guidelines
• Complying with applicable Indian laws, including the Digital Personal Data Protection Act (DPDPA), IT Act, and GST regulations`,
  },
  {
    number: '3',
    title: 'Data Sharing & Disclosure',
    icon: Globe,
    content: `StayEg does not sell, rent, or trade your personal information to third parties for their marketing purposes. We may share data only in the following narrowly defined circumstances:

With Other Users:
• A PG owner may view a tenant's name, profile photo, and contact number after a confirmed booking
• A tenant may view PG details, owner name, and contact information from the listing page
• Reviews and ratings are publicly visible to all platform users

With Service Partners:
• Razorpay — for payment processing under PCI-DSS compliance; only tokenised transaction data is shared
• KYC verification partner — encrypted ID documents are shared solely for identity verification and purged after processing
• Google Analytics — receives anonymised, aggregated usage data; no personally identifiable information is shared

Legal & Regulatory Requirements:
• In response to a valid court order, subpoena, or government directive under applicable Indian law
• To comply with the DPDPA, IT Act, GST regulations, or any other statutory obligation
• To protect the rights, safety, and property of StayEg, its users, or the public

Business Transfers:
• In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity. We will notify you via email before such a transfer takes effect.`,
  },
  {
    number: '4',
    title: 'Data Security',
    icon: Lock,
    content: `StayEg implements a defence-in-depth security posture to protect your personal information:

Technical Safeguards:
• All data in transit is encrypted using TLS 1.3
• Passwords are hashed using bcrypt with a cost factor of 12
• KYC documents are encrypted at rest using AES-256
• Regular third-party penetration testing and bug bounty programmes
• Web application firewall (WAF) and DDoS mitigation

Operational Safeguards:
• Role-based access control (RBAC) — employees access data only on a need-to-know basis
• All internal data access is logged and auditable
• Annual security awareness training for all employees
• Vendor security assessments before onboarding any third-party service
• Documented incident response plan with a 72-hour breach notification commitment

Data Retention:
• Active account data is retained for the duration your account is open
• Upon account deletion, personal data is purged from primary systems within 30 days and from backups within 90 days
• Anonymised, aggregated analytics data may be retained indefinitely for platform improvement
• Financial transaction records are retained for 7 years as mandated by Indian tax law

No system is immune to risk. We encourage you to use a strong, unique password and enable two-factor authentication where available. Report any suspected security incident to security@stayeg.in immediately.`,
  },
  {
    number: '5',
    title: 'Cookies & Tracking Technologies',
    icon: Cookie,
    content: `StayEg uses cookies and similar technologies to enhance your experience:

Essential Cookies:
• Session management and authentication
• Security features and fraud prevention
• Remembering your preferences

Analytics Cookies:
• Understanding how users interact with the Platform
• Measuring the effectiveness of features
• Google Analytics for aggregated usage data

Marketing Cookies:
• Personalized advertisements (with your consent)
• Social media sharing and tracking
• Partner marketing programs

Managing Cookies:
• You can control cookie settings in your browser
• Disabling essential cookies may affect platform functionality
• You can opt out of analytics cookies through browser settings
• We respect Do Not Track browser signals`,
  },
  {
    number: '6',
    title: 'Your Rights & Choices',
    icon: UserCheck,
    content: `Under India's Digital Personal Data Protection Act (DPDPA) 2023 and applicable regulations, you have the following rights:

Access & Portability:
• Request a complete copy of all personal data StayEg holds about you
• Download your data in a structured, machine-readable format (JSON/CSV)
• Request correction of any inaccurate or outdated personal information

Control & Deletion:
• Update or delete your profile information at any time from your account settings
• Manage email and push notification preferences granularly
• Opt out of all marketing communications with a single toggle
• Request full account deletion; we purge your data within 30 days (financial records excepted per legal requirements)

DPDPA-Specific Rights:
• Right to obtain confirmation of whether your personal data is being processed
• Right to access the specific categories of personal data and the purposes of processing
• Right to withdraw consent for any non-essential data processing activity
• Right to lodge a complaint with the Data Protection Board of India at dpb.gov.in

To exercise any of these rights, email privacy@stayeg.in with your registered email address and the specific request. We acknowledge all requests within 72 hours and resolve them within 30 calendar days as required by law.`,
  },
  {
    number: '7',
    title: "Children's Privacy",
    icon: Baby,
    content: `StayEg is not intended for children under the age of 18. We do not knowingly collect personal information from children.

If we discover that a child under 18 has provided personal information:
• We will take steps to delete such information promptly
• We may terminate the child's account
• We will notify the parent or guardian

Parents or guardians who believe their child has provided personal information to StayEg should contact us at privacy@stayeg.in, and we will take appropriate action.

Educational institutions or organizations that wish to use StayEg for students must ensure proper parental consent mechanisms are in place.`,
  },
  {
    number: '8',
    title: 'Third-Party Services',
    icon: Globe,
    content: `StayEg integrates with third-party services that may have their own privacy policies:

Payment Processing:
• Razorpay — handles all payment transactions securely
• Payment data is processed under PCI DSS compliance

Maps & Location:
• Google Maps — for property location display and navigation
• Location data shared only when you enable location services

Authentication:
• Google/Apple sign-in — for social login features
• Only basic profile information is shared

Analytics:
• Google Analytics — for platform usage analysis
• Data is anonymized and aggregated

Communication:
• WhatsApp Business API — for notifications and updates
• Phone numbers shared in compliance with TRAI regulations

We recommend reviewing the privacy policies of these third-party services. StayEg is not responsible for the privacy practices of external websites or services.`,
  },
  {
    number: '9',
    title: 'Changes to This Policy',
    icon: RefreshCw,
    content: `We may update this Privacy Policy from time to time. Changes will be communicated through:

• Email notification for material changes
• Platform notification banner for at least 15 days
• Updated "Last Updated" date at the top of this page

We encourage you to review this Policy periodically. Your continued use of the Platform after changes are posted constitutes acceptance of the updated Policy.

If you disagree with any changes, you may:
• Contact us to express concerns at privacy@stayeg.in
• Delete your account before changes take effect
• Request data export before closing your account`,
  },
  {
    number: '10',
    title: 'Contact Us',
    icon: Shield,
    content: `For privacy-related questions, data access requests, or concerns, please contact:

StayEg Data Protection Officer
StayEg Technologies Private Limited
3rd Floor, Innovation Hub, Koramangala
Bangalore 560034, Karnataka, India
Email: privacy@stayeg.in
Phone: +91 80-4567-8900

For general support:
Email: support@stayeg.in
Phone: +91 80-4567-8900
Business Hours: Monday to Saturday, 9:00 AM – 6:00 PM IST

We acknowledge all privacy-related inquiries within 72 hours and provide a substantive response within 30 calendar days, in compliance with the Digital Personal Data Protection Act 2023.`,
  },
];

export default function PrivacyPage() {
  const { setCurrentView } = useAppStore();
  const [activeSection, setActiveSection] = useState('1');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`privacy-section-${id}`);
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
            <div className={`size-10 rounded-xl ${BADGE.blue} flex items-center justify-center`}>
              <Shield className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Your privacy matters to us. Learn how we protect your data.</p>
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
              {PRIVACY_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.number}
                    onClick={() => scrollToSection(section.number)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      activeSection === section.number
                        ? 'bg-brand-teal/10 text-brand-teal font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {section.title}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {PRIVACY_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.number} id={`privacy-section-${section.number}`} className="border-border scroll-mt-24">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-7 rounded-lg bg-brand-teal/15 text-brand-teal text-xs font-bold flex items-center justify-center">
                      {section.number}
                    </span>
                    <Icon className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-4">
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
