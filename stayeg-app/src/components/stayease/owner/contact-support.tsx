'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from 'sonner';

export default function OwnerContactSupport() {
  const { setCurrentView } = useAppStore();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.message) {
      toast.error('Name and message are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      toast.success('Message sent! We will get back to you soon.');
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('OWNER_DASHBOARD')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contact & Support</h1>
          <p className="text-muted-foreground mt-1">Get help with setup, billing, or technical issues</p>
        </div>
      </div>

      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="size-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Message Sent!</h3>
              <p className="text-sm text-muted-foreground mt-2">Our team will get back to you within 24 hours.</p>
              <Button className="mt-4" onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', message: '' }); }}>
                Send Another Message
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-base">How can we help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input placeholder="Enter your name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea placeholder="Describe your issue or question..." rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
              onClick={handleSubmit}
              disabled={isSubmitting || !form.name || !form.message}
            >
              {isSubmitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
              Send Message
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
