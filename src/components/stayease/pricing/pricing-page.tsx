'use client';

import {
  Check, Sparkles, Clock, Gift, Users, Shield, Zap,
  Headphones, ArrowLeft, Star, Tag, Phone, Mail, MessageSquare,
  Crown, Building2, Wrench, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { PRICING_PLANS, AVAILABLE_COUPONS, BADGE_BORDER, BADGE } from '@/lib/constants';

const FAQ_ITEMS = [
  {
    question: 'What happens after my subscription expires?',
    answer: 'You will receive a reminder 30 days before expiration. After expiry, your dashboard enters read-only mode — you can still view data but cannot manage bookings. Reactivate anytime by renewing your plan.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! You can upgrade anytime and pay only the difference. Downgrades take effect at the next renewal cycle. Contact our support team for assistance.',
  },
  {
    question: 'Is there a money-back guarantee?',
    answer: 'Absolutely! We offer a 15-day money-back guarantee on all plans. If you\'re not satisfied within the first 15 days, we\'ll refund your full amount — no questions asked.',
  },
  {
    question: 'What is the setup fee for?',
    answer: 'The one-time setup fee covers account onboarding, property verification, staff training, and technical setup. It varies from ₹2,500 to ₹5,000 based on your location and the number of properties.',
  },
  {
    question: 'Do you offer discounts for multiple PGs?',
    answer: 'Yes! Our Growth plan supports up to 5 PGs and Enterprise offers unlimited properties. We also offer special pricing for PG chains and hostel networks — contact our sales team.',
  },
  {
    question: 'How does the FIRSTFREE coupon work?',
    answer: 'The FIRSTFREE coupon gives the first 1000 PG owners a completely free 1-year Starter subscription. Just sign up and apply the code during checkout. No credit card required!',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept UPI, credit/debit cards, net banking, and wallets. For annual plans, we also offer EMI options through major banks. All payments are processed securely via Razorpay.',
  },
  {
    question: 'Can tenants use StayEg for free?',
    answer: 'Yes! StayEg is 100% FREE for tenants. There are no charges for searching, booking, payments, or using any tenant features. We believe finding a good PG should be accessible to everyone.',
  },
];

export default function PricingPage() {
  const { setCurrentView, appliedCoupon, setAppliedCoupon, showToast } = useAppStore();

  const handleApplyCoupon = (code: string) => {
    setAppliedCoupon(code);
    showToast(`Coupon "${code}" applied successfully!`);
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(price);

  const monthlyPrice = (plan: typeof PRICING_PLANS[0]) =>
    formatPrice(Math.round(plan.price / plan.durationMonths));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-teal/10 via-background to-brand-sage/5 pt-8 pb-6">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #00ADB5 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <button
            onClick={() => setCurrentView('LANDING')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-teal transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>

          <Badge className="bg-brand-teal/15 text-brand-teal border-brand-teal/20 mb-4 px-3 py-1 text-xs">
            <Sparkles className="size-3 mr-1" />
            Pricing Plans
          </Badge>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            PG Owner? Manage Everything
            <br />
            <span className="bg-gradient-to-r from-brand-deep to-brand-teal bg-clip-text text-transparent">
              from Your Phone
            </span>
          </h1>

          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg mb-6">
            The all-in-one platform for PG owners to manage rooms, tenants, rent, vendors, and staff.
            Affordable plans designed for every scale of operation.
          </p>

          {/* Limited Time Banner */}
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-brand-deep to-brand-teal text-white px-5 py-3 rounded-2xl shadow-lg shadow-brand-teal/20 mb-2">
            <Gift className="size-5 shrink-0" />
            <div className="text-left">
              <div className="font-bold text-sm">First 1000 PG Owners Get 1 Year FREE!</div>
              <div className="text-white/80 text-xs">Use code FIRSTFREE at checkout</div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs shrink-0">
              <Clock className="size-3 mr-1" />
              Limited Time Offer
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-1 pt-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all hover:shadow-xl ${
                plan.popular
                  ? 'border-2 border-brand-teal shadow-lg shadow-brand-teal/10 scale-[1.02] md:scale-105'
                  : 'border border-border hover:border-brand-teal/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-deep to-brand-teal" />
              )}

              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {plan.popular ? (
                    <Crown className="size-5 text-brand-teal" />
                  ) : plan.id === 'biyearly' ? (
                    <Star className="size-5 text-brand-sage" />
                  ) : (
                    <Zap className="size-5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>

                <CardDescription className="text-sm text-muted-foreground">{plan.duration} Subscription</CardDescription>

                {plan.badge && (
                  <Badge
                    className={`mt-2 ${
                      plan.popular
                        ? 'bg-brand-teal text-white hover:bg-brand-deep'
                        : 'bg-brand-sage/15 text-brand-sage'
                    }`}
                  >
                    {plan.badge}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center pb-2">
                  <div className="flex items-baseline justify-center gap-2">
                    {plan.discount > 0 && (
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(plan.originalPrice)}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(plan.price)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {monthlyPrice(plan)}/month · one-time
                  </div>
                </div>

                <Separator />

                {/* Features */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Includes</p>
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <div className="size-5 rounded-full bg-brand-lime/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="size-3 text-brand-lime" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Setup Fee */}
                <div className="bg-muted rounded-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">One-time setup fee:</span>{' '}
                    {formatPrice(plan.setupFee)} (based on location &amp; conditions)
                  </p>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  className={`w-full font-semibold py-5 text-sm ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white shadow-lg shadow-brand-teal/20'
                      : 'bg-foreground hover:bg-foreground/80 text-background'
                  }`}
                  onClick={() => showToast(`${plan.name} plan selected! Proceeding to checkout...`)}
                >
                  Get Started
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Setup Fee Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Setup Fee Note:</span> A one-time setup fee of ₹2,500 – ₹5,000
            applies based on your location and property conditions. This covers onboarding, property verification,
            and staff training.
          </p>
        </div>
      </section>

      {/* Free for Tenants & Vendors */}
      <section className="bg-gradient-to-b from-muted to-background py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-8">
            Everyone Benefits on StayEg
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tenants */}
            <Card className="border-brand-lime/20 bg-gradient-to-br from-brand-lime/10 to-background">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-brand-lime/20 flex items-center justify-center shrink-0">
                    <Users className="size-6 text-brand-lime" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">100% FREE for Tenants</h3>
                      <Badge className="bg-green-500 text-white border-0">FREE</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Search PGs, book rooms, make payments, file complaints, join communities — all completely free.
                      No hidden charges, no subscription fees. StayEg is committed to making PG hunting accessible.
                    </p>
                    <ul className="space-y-1.5 pt-1">
                      {['Browse & search unlimited PGs', 'Book & manage stays', 'Online rent payments', 'Community access'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="size-4 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendors */}
            <Card className="border-brand-sage/20 bg-gradient-to-br from-brand-sage/10 to-background">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-brand-sage/15 flex items-center justify-center shrink-0">
                    <Wrench className="size-6 text-brand-sage" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">List Services for Free</h3>
                      <Badge className="bg-brand-sage text-white border-0">PAY PER LEAD</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      List your plumbing, electrical, cleaning, and other services for free. You only pay when you
                      receive a qualified lead — no upfront costs, no subscriptions.
                    </p>
                    <ul className="space-y-1.5 pt-1">
                      {['Free service listing', 'Get leads from PG owners', 'Manage bookings', 'Build your reputation'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="size-4 text-brand-sage" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Coupon Section */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className={`${BADGE_BORDER.purple} mb-3`}>
              <Tag className="size-3 mr-1" />
              Available Coupons
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Save More with Coupons
            </h2>
            <p className="text-muted-foreground mt-2">Grab these offers before they expire!</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AVAILABLE_COUPONS.map((coupon) => {
              const isApplied = appliedCoupon === coupon.code;
              return (
                <Card key={coupon.code} className={`overflow-hidden transition-all ${isApplied ? 'border-green-400 ring-2 ring-green-100' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-sm bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded">
                            {coupon.code}
                          </code>
                          {coupon.discountPercent > 0 && (
                            <Badge className={`${BADGE.green} border-0 text-xs`}>
                              {coupon.discountPercent}% OFF
                            </Badge>
                          )}
                          {coupon.discountPercent === 0 && coupon.flatDiscount && (
                            <Badge className={`${BADGE.green} border-0 text-xs`}>
                              ₹{coupon.flatDiscount} OFF
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{coupon.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Valid till {new Date(coupon.validTill).toLocaleDateString('en-IN', {
                            month: 'short', year: 'numeric',
                          })}
                          {coupon.minAmount > 0 && ` · Min. ${formatPrice(coupon.minAmount)}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isApplied ? 'outline' : 'default'}
                        className={`shrink-0 text-xs ${
                          isApplied
                            ? 'text-brand-lime border-brand-lime/30 bg-brand-lime/15'
                            : 'bg-foreground hover:bg-foreground/80'
                        }`}
                        onClick={() => handleApplyCoupon(coupon.code)}
                        disabled={isApplied}
                      >
                        {isApplied ? 'Applied ✓' : 'Apply'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="bg-brand-teal/15 text-brand-teal border-brand-teal/20 mb-3">
              <MessageSquare className="size-3 mr-1" />
              FAQ
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mt-2">Everything you need to know about our plans</p>
          </div>

          <Card className="border-border">
            <CardContent className="p-2">
              <Accordion type="single" collapsible className="w-full">
                {FAQ_ITEMS.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`} className="px-4">
                    <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-brand-teal hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Sales CTA */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-foreground to-foreground/80 text-background">
            <CardContent className="p-8 text-center">
              <Headphones className="size-10 text-brand-teal mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Still Have Questions?</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Our sales team is here to help you choose the right plan for your PG business.
                Get a personalized demo and custom pricing for your needs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white font-semibold px-6"
                  onClick={() => showToast('Sales team will contact you shortly!')}
                >
                  <Phone className="size-4 mr-2" />
                  Contact Sales
                </Button>
                <Button
                  variant="outline"
                  className="border-muted-foreground/30 text-muted-foreground hover:text-background hover:bg-muted-foreground/20 px-6"
                  onClick={() => showToast('Email sent to sales@stayeg.in')}
                >
                  <Mail className="size-4 mr-2" />
                  sales@stayeg.in
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom Spacer for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
