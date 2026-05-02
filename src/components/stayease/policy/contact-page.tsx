'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  Headphones,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Twitter,
  Linkedin,
  Instagram,
  HelpCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/use-app-store';
import { toast } from '@/lib/toast';

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

function StaggerContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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

function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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
/*  Contact Cards Data                                                 */
/* ------------------------------------------------------------------ */

const CONTACT_CARDS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'support@stayeg.in',
    description: 'We reply within 2 hours during business hours',
    color: 'bg-brand-teal/15 text-brand-teal',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+91 80-4567-8900',
    description: 'Monday to Saturday, 9 AM – 6 PM IST',
    color: 'bg-brand-sage/15 text-brand-sage',
  },
  {
    icon: MapPin,
    label: 'Office Address',
    value: 'StayEg Technologies Pvt. Ltd.',
    description: '3rd Floor, Innovation Hub, Koramangala, Bangalore 560034, Karnataka, India',
    color: 'bg-brand-deep-light text-brand-deep',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Mon – Sat, 9:00 AM – 6:00 PM',
    description: 'Emergency helpline available 24/7',
    color: 'bg-brand-teal/15 text-brand-teal',
  },
];

const SOCIAL_LINKS = [
  {
    icon: Twitter,
    label: 'Twitter / X',
    handle: '@StayEgIndia',
    color: 'hover:border-brand-teal/30 hover:bg-brand-teal/10',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    handle: 'StayEg Technologies',
    color: 'hover:border-brand-teal/30 hover:bg-brand-teal/10',
  },
  {
    icon: Instagram,
    label: 'Instagram',
    handle: '@stayeg.india',
    color: 'hover:border-brand-teal/30 hover:bg-brand-teal/10',
  },
];

const SUBJECT_OPTIONS = [
  { value: 'booking', label: 'Booking Related' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'complaint', label: 'Complaint Escalation' },
  { value: 'listing', label: 'List My PG' },
  { value: 'feedback', label: 'Feedback / Suggestion' },
  { value: 'partnership', label: 'Partnership Inquiry' },
  { value: 'other', label: 'Other' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ContactPage() {
  const { setCurrentView } = useAppStore();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject, message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }
      toast.success('Message sent successfully! We\'ll get back to you within 2 hours.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Headphones className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Contact &amp; Support</h1>
              <p className="text-sm text-muted-foreground">Get in touch — we&apos;re here to help</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ============================================================ */}
        {/*  Contact Cards                                               */}
        {/* ============================================================ */}
        <FadeIn>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Reach Out To Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {CONTACT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.label} className="border-border hover:border-brand-teal/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`size-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">{card.label}</p>
                          <p className="text-sm font-semibold text-foreground">{card.value}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
                        </div>
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
        {/*  Contact Form + Map                                           */}
        {/* ============================================================ */}
        <section>
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Form */}
            <FadeIn className="lg:col-span-3">
              <Card className="border-border">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-1">Send Us a Message</h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    Fill out the form below and our team will respond promptly.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name" className="text-sm font-medium">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contact-name"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email" className="text-sm font-medium">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-subject" className="text-sm font-medium">
                        Subject <span className="text-destructive">*</span>
                      </Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="What is this about?" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-message" className="text-sm font-medium">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Describe your question or issue in detail..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        className="resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white border-0 w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="size-4 mr-2" />
                      )}
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </FadeIn>

            {/* Map placeholder + Social */}
            <FadeIn delay={0.15} className="lg:col-span-2 space-y-4">
              {/* Map */}
              <Card className="border-border overflow-hidden">
                <div className="bg-gradient-to-br from-muted to-muted/50 h-48 sm:h-56 flex flex-col items-center justify-center gap-3 relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgwLDAsMCwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
                  <div className="relative z-10 size-12 rounded-full bg-brand-teal/15 flex items-center justify-center">
                    <MapPin className="size-6 text-brand-teal" />
                  </div>
                  <div className="relative z-10 text-center">
                    <p className="text-sm font-semibold text-foreground">Bangalore, India</p>
                    <p className="text-xs text-muted-foreground">Koramangala, Karnataka 560034</p>
                  </div>
                </div>
              </Card>

              {/* Social media links */}
              <Card className="border-border">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-foreground mb-3">Follow Us</p>
                  <div className="space-y-2">
                    {SOCIAL_LINKS.map((social) => {
                      const Icon = social.icon;
                      return (
                        <div
                          key={social.label}
                          className={`flex items-center gap-3 rounded-lg border border-border p-3 transition-colors cursor-pointer ${social.color}`}
                        >
                          <div className="size-9 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                            <Icon className="size-4 text-brand-teal" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{social.label}</p>
                            <p className="text-xs text-muted-foreground">{social.handle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </section>

        <Separator />

        {/* ============================================================ */}
        {/*  FAQ Teaser                                                  */}
        {/* ============================================================ */}
        <FadeIn>
          <Card className="border-brand-teal/20 bg-gradient-to-br from-brand-teal/5 via-brand-sage/5 to-background">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="size-12 rounded-2xl bg-brand-teal/15 flex items-center justify-center shrink-0">
                <HelpCircle className="size-6 text-brand-teal" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-semibold text-foreground mb-1">Need Instant Answers?</h3>
                <p className="text-sm text-muted-foreground">
                  Check our Help Center for FAQs, step-by-step guides, and quick troubleshooting.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setCurrentView('HELP')}
              >
                <HelpCircle className="size-4 mr-2" />
                Visit Help Center
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
