'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  MessageSquare,
  Phone,
  PhoneCall,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  Sparkles,
  Volume2,
  Shield,
  ShieldCheck,
  CircleHelp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  Siren,
  Flame,
  Heart,
  UserCheck,
  Lock,
  Headphones,
  FileText,
  HelpCircle,
  BookOpen,
  ExternalLink,
  LifeBuoy,
  MessageCircle,
  X,
  Zap,
  Home,
  Eye,
  Star,
  Mail,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '@/lib/animations';
import { STATUSES, BADGE } from '@/lib/constants';
import type { Complaint, Booking, PG, User } from '@/lib/types';

// ─── Constants ───────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  MAINTENANCE: Wrench,
  CLEANLINESS: Sparkles,
  NOISE: Volume2,
  SAFETY: Shield,
  FOOD: CircleHelp,
  GENERAL: CircleHelp,
  OTHER: CircleHelp,
};

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance',
  CLEANLINESS: 'Cleanliness',
  NOISE: 'Noise',
  SAFETY: 'Safety',
  FOOD: 'Food',
  GENERAL: 'General',
  OTHER: 'Other',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: BADGE.blue,
  MEDIUM: 'bg-brand-sage/10 text-brand-sage',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: BADGE.red,
};

const TIMELINE_STEPS = [
  { status: 'OPEN', label: 'Submitted', icon: Send },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { status: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
  { status: 'CLOSED', label: 'Closed', icon: CheckCircle2 },
];

const EMERGENCY_CONTACTS = [
  { name: 'Police', number: '100', icon: Shield, color: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Ambulance', number: '108', icon: Heart, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { name: 'Women Helpline', number: '1091', icon: ShieldCheck, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { name: 'Fire Department', number: '101', icon: Flame, color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const SAFETY_TIPS = [
  {
    title: 'Keep Your Room Locked',
    description: 'Always lock your room when stepping out, even for a short time. Use the deadbolt if available.',
    icon: Lock,
  },
  {
    title: 'Know Your Emergency Exits',
    description: 'Familiarise yourself with emergency exits and fire extinguisher locations in your PG building.',
    icon: Zap,
  },
  {
    title: 'Share Your Location',
    description: 'Keep a trusted friend or family member informed about your PG address and daily schedule.',
    icon: Home,
  },
  {
    title: 'Secure Your Valuables',
    description: 'Use a personal locker for cash, jewellery, and important documents. Never leave them unattended.',
    icon: Eye,
  },
  {
    title: 'Report Suspicious Activity',
    description: 'If you notice anything unusual, inform the PG owner or management immediately. Use the Emergency SOS if needed.',
    icon: ShieldCheck,
  },
  {
    title: 'Get Rent Receipts',
    description: 'Always collect rent receipts and keep a record of payments. This protects you in case of disputes.',
    icon: FileText,
  },
];

const TRUST_FEATURES = [
  {
    title: 'Verified PGs',
    description: 'Every PG listed on StayEg undergoes a physical verification by our team before approval.',
    icon: UserCheck,
  },
  {
    title: 'Secure Payments',
    description: 'All rent payments are processed through secure channels with proper receipts and tracking.',
    icon: Lock,
  },
  {
    title: '24/7 Support',
    description: 'Our support team is available round-the-clock to assist with any issues or emergencies.',
    icon: Headphones,
  },
  {
    title: 'Verified Owners',
    description: 'PG owners are verified with government ID proof and property documents.',
    icon: Star,
  },
];

const FAQ_DATA = [
  {
    q: 'How do I raise a complaint?',
    a: 'Go to the "Complaints" tab and click the "Raise Complaint" button. Fill in the details including the PG, category, priority, and description. Your complaint will be tracked until resolution.',
  },
  {
    q: 'What happens after I raise a complaint?',
    a: 'Your complaint is first marked as OPEN. The PG owner will review it and may assign it to staff. You can track the status: OPEN → IN_PROGRESS → RESOLVED → CLOSED.',
  },
  {
    q: 'How long does complaint resolution take?',
    a: 'Most complaints are addressed within 24-48 hours. Urgent complaints related to safety or essential services (water, electricity) are prioritised and typically resolved within 4-6 hours.',
  },
  {
    q: 'Can I contact my PG owner directly?',
    a: 'Yes! Use the "Contact Owner" tab to find your PG owner\'s phone number and email. You can also use the quick message templates to send a WhatsApp message directly.',
  },
  {
    q: 'What should I do in an emergency?',
    a: 'Use the "Emergency" tab to access the SOS button. It will display emergency instructions along with numbers for Police (100), Ambulance (108), Women Helpline (1091), and Fire (101). Tap any number to call directly.',
  },
  {
    q: 'How do I cancel my booking?',
    a: 'Go to "My Bookings" from the main menu and select the booking you want to cancel. Please review the cancellation policy in the Refund Policy page before cancelling.',
  },
  {
    q: 'Is my payment secure on StayEg?',
    a: 'Yes, all payments are processed through secure, encrypted channels. You will always receive a payment receipt. StayEg never stores your full card or bank details.',
  },
  {
    q: 'What is the refund policy?',
    a: 'Refunds depend on the cancellation timing and the PG\'s specific policy. Generally, cancellations 7+ days before check-in receive a full refund minus processing fees. Check the Refund Policy page for detailed terms.',
  },
  {
    q: 'How do I report a safety concern?',
    a: 'You can report safety concerns through the Complaints tab (select "Safety" category with "High" or "Urgent" priority). For immediate threats, use the Emergency SOS button.',
  },
  {
    q: 'How do I update my KYC documents?',
    a: 'Go to your Profile page and navigate to the KYC section. Upload your Aadhaar and PAN card images. Our team will verify them within 24 hours.',
  },
];

const MESSAGE_TEMPLATES = [
  { label: "I'll be late today", message: "Hi, I'll be arriving late today. Please keep the main door unlocked. Thank you!" },
  { label: 'Rent payment done', message: 'Hi, I have completed the rent payment for this month. Please confirm receipt. Thanks!' },
  { label: 'Maintenance needed', message: 'Hi, there is a maintenance issue in my room that needs attention. Could you please look into it? Thank you.' },
  { label: 'Guest visiting today', message: 'Hi, I have a guest visiting today. They will arrive around [time]. Please let them in. Thank you!' },
];

// ─── Helper: snake_case → camelCase for API data ─────────────────────

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mapKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = value;
  }
  return result;
}

function formatApiData<T>(data: Record<string, unknown>[]): T[] {
  return data.map((item) => {
    const mapped = mapKeys(item);
    // Preserve nested relations
    if (item.pg) mapped.pg = typeof item.pg === 'object' ? mapKeys(item.pg as Record<string, unknown>) : item.pg;
    if (item.user) mapped.user = typeof item.user === 'object' ? mapKeys(item.user as Record<string, unknown>) : item.user;
    if (item.bed) mapped.bed = typeof item.bed === 'object' ? mapKeys(item.bed as Record<string, unknown>) : item.bed;
    return mapped as T;
  });
}

// ─── Complaints Tab ──────────────────────────────────────────────────

function ComplaintsTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const { currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    pgId: '',
    title: '',
    category: 'GENERAL' as string,
    priority: 'MEDIUM' as string,
    description: '',
  });

  // Fetch complaints
  const { data: complaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ['complaints', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const res = await authFetch(`/api/complaints?userId=${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch complaints');
      const raw = await res.json();
      return formatApiData<Complaint>(raw);
    },
    enabled: !!currentUser?.id,
  });

  // Fetch active booking for PG selector
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['active-bookings', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const res = await authFetch(`/api/bookings?userId=${currentUser.id}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return formatApiData<Booking>(raw);
    },
    enabled: !!currentUser?.id,
  });

  // Derive unique PGs from bookings + complaints
  const userPGs = useMemo(() => {
    const pgMap = new Map<string, PG>();
    bookings.forEach((b) => {
      if (b.pg && b.pg.id && !pgMap.has(b.pg.id)) {
        pgMap.set(b.pg.id, b.pg);
      }
    });
    complaints.forEach((c) => {
      if (c.pg && c.pg.id && !pgMap.has(c.pg.id)) {
        pgMap.set(c.pg.id, c.pg);
      }
    });
    return Array.from(pgMap.values());
  }, [bookings, complaints]);

  // Active booking PG for default selection
  const activeBooking = useMemo(() => {
    return bookings.find((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED');
  }, [bookings]);

  const filteredComplaints = useMemo(() => {
    if (statusFilter === 'ALL') return complaints;
    return complaints.filter((c) => c.status === statusFilter);
  }, [complaints, statusFilter]);

  const stats = useMemo(() => {
    const open = complaints.filter((c) => c.status === 'OPEN').length;
    const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    return { open, inProgress, resolved, total: complaints.length };
  }, [complaints]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.pgId || !currentUser?.id) {
      toast.error('Please fill in the required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          pgId: formData.pgId,
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          priority: formData.priority,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setFormData({ pgId: '', title: '', category: 'GENERAL', priority: 'MEDIUM', description: '' });
      setDialogOpen(false);
      toast.success('Complaint submitted successfully!');
    } catch {
      toast.error('Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepStatus = (complaint: Complaint, stepStatus: string) => {
    const order = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    return order.indexOf(stepStatus) <= order.indexOf(complaint.status) ? 'completed' : 'pending';
  };

  const openComplaintDialog = () => {
    if (activeBooking?.pgId) {
      setFormData((prev) => ({ ...prev, pgId: activeBooking.pgId }));
    }
    setDialogOpen(true);
  };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      {/* Header + Raise Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Complaints</h2>
          <p className="text-sm text-muted-foreground">Track and manage your issues</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openComplaintDialog}
              className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white gap-2 shadow-sm"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Raise Complaint</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Raise a Complaint</DialogTitle>
              <DialogDescription>Describe your issue so we can help resolve it quickly.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* PG Selector */}
              <div className="space-y-2">
                <Label>
                  PG <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.pgId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, pgId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a PG" />
                  </SelectTrigger>
                  <SelectContent>
                    {userPGs.map((pg) => (
                      <SelectItem key={pg.id} value={pg.id}>
                        {pg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {userPGs.length === 0 && (
                  <p className="text-xs text-muted-foreground">No PGs found. Book a PG first to raise complaints.</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="comp-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="comp-title"
                  placeholder="Briefly describe the issue"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              {/* Category + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData((p) => ({ ...p, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="comp-desc">Description</Label>
                <Textarea
                  id="comp-desc"
                  placeholder="Provide more details about the issue..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.pgId || isSubmitting}
                className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
                Submit Complaint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Open', count: stats.open, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'In Progress', count: stats.inProgress, color: 'text-brand-sage', bg: 'bg-brand-sage/10' },
            { label: 'Resolved', count: stats.resolved, color: 'text-brand-lime', bg: 'bg-brand-lime/15' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <Card className="border shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.count}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Status Filters */}
      {complaints.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter
                  ? 'bg-brand-teal text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {filter === 'ALL' ? 'All' : filter === 'IN_PROGRESS' ? 'In Progress' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* Complaints List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 px-4"
        >
          <div className="size-16 rounded-full bg-brand-lime/15 flex items-center justify-center mb-4">
            <MessageSquare className="size-7 text-brand-lime" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {statusFilter === 'ALL' ? 'No complaints yet' : `No ${statusFilter.toLowerCase().replace('_', ' ')} complaints`}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 text-center max-w-sm">
            {statusFilter === 'ALL'
              ? 'Everything looks good! If you have an issue, raise a complaint and we\'ll help resolve it.'
              : 'No complaints match this filter.'}
          </p>
          {statusFilter === 'ALL' && (
            <Button
              size="sm"
              onClick={openComplaintDialog}
              className="bg-brand-teal hover:bg-brand-deep text-white"
            >
              <Plus className="size-4 mr-1" />
              Raise Complaint
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          {filteredComplaints.map((complaint) => {
            const statusConfig = STATUSES.COMPLAINT[complaint.status as keyof typeof STATUSES.COMPLAINT];
            const CatIcon = CATEGORY_ICONS[complaint.category] || CircleHelp;
            const isExpanded = expandedId === complaint.id;

            return (
              <motion.div key={complaint.id} variants={staggerItem}>
                <Card className="border shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    {/* Main Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="size-10 bg-brand-teal/10 rounded-xl flex items-center justify-center shrink-0">
                        <CatIcon className="size-5 text-brand-teal" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm truncate">
                          {complaint.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="capitalize">{CATEGORY_LABELS[complaint.category] || complaint.category}</span>
                          <span className="text-muted-foreground/40">|</span>
                          <span>{format(new Date(complaint.createdAt), 'dd MMM yyyy')}</span>
                          {complaint.pg && (
                            <>
                              <span className="text-muted-foreground/40">|</span>
                              <span className="truncate max-w-[120px]">{complaint.pg.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusConfig?.color || ''}`}>
                          {statusConfig?.label || complaint.status}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[complaint.priority] || ''}`}>
                          {complaint.priority}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground ml-1" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground ml-1" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Separator />
                          <div className="p-4 space-y-4">
                            {complaint.description && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  Description
                                </h4>
                                <p className="text-sm text-foreground">{complaint.description}</p>
                              </div>
                            )}

                            {complaint.resolution && (
                              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">
                                  Resolution
                                </h4>
                                <p className="text-sm text-foreground">{complaint.resolution}</p>
                              </div>
                            )}

                            {/* Timeline */}
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Status Timeline
                              </h4>
                              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                                {TIMELINE_STEPS.map((step, i) => {
                                  const stepState = getStepStatus(complaint, step.status);
                                  const StepIcon = step.icon;
                                  return (
                                    <div key={step.status} className="flex items-center flex-1 min-w-0">
                                      <div className="flex flex-col items-center">
                                        <div
                                          className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                                            stepState === 'completed'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                              : 'bg-muted text-muted-foreground'
                                          }`}
                                        >
                                          <StepIcon className="size-3.5" />
                                        </div>
                                        <span
                                          className={`text-[10px] mt-1 text-center leading-tight ${
                                            stepState === 'completed'
                                              ? 'text-green-700 dark:text-green-400 font-medium'
                                              : 'text-muted-foreground'
                                          }`}
                                        >
                                          {step.label}
                                        </span>
                                      </div>
                                      {i < TIMELINE_STEPS.length - 1 && (
                                        <div
                                          className={`flex-1 h-0.5 mx-1 mb-4 ${
                                            getStepStatus(complaint, TIMELINE_STEPS[i + 1].status) === 'completed'
                                              ? 'bg-green-200 dark:bg-green-800'
                                              : 'bg-muted'
                                          }`}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Emergency Tab ───────────────────────────────────────────────────

function EmergencyTab({ activeBookingPG, ownerInfo }: { activeBookingPG?: PG; ownerInfo?: User }) {
  const [sosOpen, setSosOpen] = useState(false);
  const [sosStep, setSosStep] = useState<'confirm' | 'instructions'>('confirm');

  const handleSosConfirm = () => {
    setSosStep('instructions');
  };

  const closeSos = () => {
    setSosOpen(false);
    setTimeout(() => setSosStep('confirm'), 200);
  };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      {/* SOS Button */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center py-2"
      >
        <Dialog open={sosOpen} onOpenChange={setSosOpen}>
          <DialogTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="relative w-36 h-36 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-shadow"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-red-400/20"
              />
              <Siren className="size-10 text-white relative z-10" />
              <span className="text-white font-bold text-lg relative z-10">Emergency SOS</span>
            </motion.button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {sosStep === 'confirm' ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="size-5" />
                    Emergency SOS
                  </DialogTitle>
                  <DialogDescription>
                    Are you in an emergency? This will show you emergency contacts and instructions.
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 my-2">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    If you are in immediate danger, call the police at <strong>100</strong> right away.
                  </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={closeSos}>Cancel</Button>
                  <a href="tel:100" className="inline-flex">
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      <PhoneCall className="size-4 mr-2" />
                      Call Police Now
                    </Button>
                  </a>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <LifeBuoy className="size-5" />
                    Emergency Instructions
                  </DialogTitle>
                  <DialogDescription>Follow these steps to stay safe:</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-80 pr-2">
                  <div className="space-y-3 my-2">
                    {[
                      { step: 1, text: 'Move to a safe location away from immediate danger.' },
                      { step: 2, text: 'Call emergency services (Police: 100, Ambulance: 108).' },
                      { step: 3, text: 'Inform your PG owner or warden about the situation.' },
                      { step: 4, text: 'Contact a trusted family member or friend.' },
                      { step: 5, text: 'If possible, note down details of the incident.' },
                      { step: 6, text: 'File a complaint on StayEg once you are safe.' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="size-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0 text-xs font-bold">
                          {item.step}
                        </div>
                        <p className="text-sm text-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button onClick={closeSos}>Got It, I&apos;m Safe</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Tap the SOS button for emergency contacts and instructions
        </p>
      </motion.div>

      {/* Emergency Contacts */}
      <motion.div variants={slideUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Emergency Contacts</h3>
        <div className="grid grid-cols-2 gap-3">
          {EMERGENCY_CONTACTS.map((contact) => (
            <a key={contact.number} href={`tel:${contact.number}`} className="block">
              <Card className={`border hover:shadow-md transition-shadow cursor-pointer ${contact.color}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-white/70 dark:bg-black/20 flex items-center justify-center shrink-0">
                    <contact.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{contact.name}</div>
                    <div className="text-xs font-bold">{contact.number}</div>
                  </div>
                  <Phone className="size-4 ml-auto shrink-0 opacity-70" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </motion.div>

      {/* PG Owner Contact (if active booking) */}
      {ownerInfo && (
        <motion.div variants={slideUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">Your PG Owner</h3>
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                  <span className="text-brand-teal font-bold text-lg">
                    {ownerInfo.name?.charAt(0).toUpperCase() || 'O'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{ownerInfo.name}</div>
                  {activeBookingPG && (
                    <div className="text-xs text-muted-foreground truncate">{activeBookingPG.name}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {ownerInfo.phone && (
                  <a href={`tel:${ownerInfo.phone}`} className="flex-1">
                    <Button variant="outline" className="w-full text-xs gap-1.5" size="sm">
                      <PhoneCall className="size-3.5" />
                      Call
                    </Button>
                  </a>
                )}
                {ownerInfo.phone && (
                  <a
                    href={`https://wa.me/91${ownerInfo.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white" size="sm">
                      <MessageCircle className="size-3.5" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Contact Owner Tab ───────────────────────────────────────────────

function ContactOwnerTab({ activeBookingPG, ownerInfo }: { activeBookingPG?: PG; ownerInfo?: User }) {
  const openWhatsApp = (message: string) => {
    if (!ownerInfo?.phone) {
      toast.error('Owner phone number not available');
      return;
    }
    const phone = ownerInfo.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${phone}?text=${encoded}`, '_blank');
  };

  if (!ownerInfo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <UserCheck className="size-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No Active Booking</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You need an active booking to contact your PG owner. Book a PG first, then come back here.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      {/* Owner Info Card */}
      <motion.div variants={slideUp} initial="hidden" animate="visible">
        <Card className="border shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-brand-deep to-brand-teal" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center shadow-sm shrink-0">
                <span className="text-white font-bold text-xl">
                  {ownerInfo.name?.charAt(0).toUpperCase() || 'O'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-lg truncate">{ownerInfo.name}</h3>
                {activeBookingPG && (
                  <p className="text-sm text-muted-foreground truncate">{activeBookingPG.name}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  {ownerInfo.isVerified !== undefined && (
                    <Badge className="bg-green-100 text-green-700 text-[10px] gap-1">
                      <ShieldCheck className="size-3" />
                      Verified Owner
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="mt-5 space-y-3">
              {ownerInfo.phone && (
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Phone className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="text-sm font-medium text-foreground">{ownerInfo.phone}</div>
                  </div>
                </div>
              )}
              {ownerInfo.email && (
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-medium text-foreground truncate">{ownerInfo.email}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5">
              {ownerInfo.phone && (
                <a href={`tel:${ownerInfo.phone}`} className="flex-1">
                  <Button className="w-full gap-2 bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm">
                    <PhoneCall className="size-4" />
                    Call Owner
                  </Button>
                </a>
              )}
              {ownerInfo.phone && (
                <a
                  href={`https://wa.me/91${ownerInfo.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm">
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Message Templates */}
      <motion.div variants={slideUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Messages</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Tap a template to send a pre-filled WhatsApp message
        </p>
        <div className="space-y-2">
          {MESSAGE_TEMPLATES.map((template) => (
            <motion.button
              key={template.label}
              whileTap={{ scale: 0.98 }}
              onClick={() => openWhatsApp(template.message)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className="size-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <MessageCircle className="size-4 text-green-700 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{template.label}</div>
                <div className="text-xs text-muted-foreground truncate">{template.message}</div>
              </div>
              <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Safety Tab ──────────────────────────────────────────────────────

function SafetyTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      {/* Safety Tips */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Safety Tips for Tenants</h3>
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          {SAFETY_TIPS.map((tip) => (
            <motion.div key={tip.title} variants={staggerItem}>
              <Card className="border shadow-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                    <tip.icon className="size-4 text-brand-teal" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Separator />

      {/* Verified Owner Badge */}
      <motion.div variants={slideUp} initial="hidden" animate="visible">
        <Card className="border border-brand-teal/20 bg-brand-teal/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-brand-teal/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-brand-teal" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Verified Owner Badge</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  A green &quot;Verified&quot; badge next to a PG owner&apos;s name means they have been verified by StayEg.
                  This includes ID proof verification, property document checks, and a physical visit by our team.
                  Verified PGs are generally safer and more reliable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* StayEg Trust Features */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">StayEg Trust Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRUST_FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={slideUp}
              initial="hidden"
              animate="visible"
            >
              <Card className="border shadow-sm h-full">
                <CardContent className="p-4">
                  <div className="size-9 rounded-lg bg-brand-deep/10 flex items-center justify-center mb-2">
                    <feature.icon className="size-4 text-brand-deep" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Report Issue CTA */}
      <motion.div variants={slideUp} initial="hidden" animate="visible">
        <Button
          onClick={() => onSwitchTab('complaints')}
          variant="outline"
          className="w-full gap-2 border-dashed"
        >
          <AlertTriangle className="size-4" />
          Report a Safety Issue
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Help Tab ────────────────────────────────────────────────────────

function HelpTab() {
  const { setCurrentView } = useAppStore();

  const policyLinks = [
    { label: 'User Guide', view: 'TENANT_GUIDE' as const, icon: BookOpen },
    { label: 'Terms of Service', view: 'TERMS' as const, icon: FileText },
    { label: 'Privacy Policy', view: 'PRIVACY' as const, icon: Shield },
    { label: 'Refund Policy', view: 'REFUND_POLICY' as const, icon: LifeBuoy },
    { label: 'About StayEg', view: 'ABOUT' as const, icon: Star },
    { label: 'Help Center', view: 'HELP' as const, icon: HelpCircle },
    { label: 'How It Works', view: 'HOW_IT_WORKS' as const, icon: Zap },
  ];

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      {/* FAQ */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Frequently Asked Questions</h3>
        <motion.div variants={slideUp} initial="hidden" animate="visible">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {FAQ_DATA.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="px-4">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3.5">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Separator />

      {/* Contact Support CTA */}
      <motion.div variants={slideUp} initial="hidden" animate="visible">
        <Card className="border border-brand-teal/20 bg-gradient-to-br from-brand-teal/5 to-brand-deep/5 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="size-12 rounded-full bg-brand-teal/15 flex items-center justify-center mx-auto mb-3">
              <Headphones className="size-6 text-brand-teal" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Need More Help?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Our support team is available 24/7. Reach out and we&apos;ll get back to you as soon as possible.
            </p>
            <Button
              onClick={() => setCurrentView('CONTACT')}
              className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white shadow-sm gap-2"
            >
              <MessageSquare className="size-4" />
              Contact StayEg Support
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* Quick Links */}
      <motion.div variants={slideUp} initial="hidden" animate="visible">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
        <div className="space-y-1">
          {policyLinks.map((link) => (
            <button
              key={link.view}
              onClick={() => setCurrentView(link.view)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <link.icon className="size-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{link.label}</span>
              <ChevronDown className="size-3.5 text-muted-foreground -rotate-90" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function TenantSupport() {
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState('complaints');

  // Fetch active booking for owner/PG info
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['active-bookings-support', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const res = await authFetch(`/api/bookings?userId=${currentUser.id}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return formatApiData<Booking>(raw);
    },
    enabled: !!currentUser?.id,
  });

  // Fetch PG owner info if we have an active booking
  const activeBooking = useMemo(() => {
    return bookings.find((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED');
  }, [bookings]);

  const activeBookingPG = activeBooking?.pg;

  // Fetch owner details
  const { data: ownerInfo } = useQuery<User | undefined>({
    queryKey: ['pg-owner', activeBookingPG?.id],
    queryFn: async (): Promise<User | undefined> => {
      if (!activeBookingPG?.id) return undefined;
      const res = await authFetch(`/api/pgs/${activeBookingPG.id}`);
      if (!res.ok) return undefined;
      const raw = await res.json();
      // The PGs [id] route returns the PG with owner nested
      const mapped = mapKeys(raw) as Record<string, unknown>;
      const pgOwner = mapped.owner as Record<string, unknown> | undefined;
      if (!pgOwner) return undefined;
      return mapKeys(pgOwner) as unknown as User;
    },
    enabled: !!activeBookingPG?.id,
  });

  const handleSwitchTab = (tab: string) => {
    setActiveTab(tab);
  };

  const tabItems = [
    { value: 'complaints', label: 'Complaints', icon: MessageSquare },
    { value: 'emergency', label: 'Emergency', icon: Siren },
    { value: 'contact-owner', label: 'Contact Owner', icon: PhoneCall },
    { value: 'safety', label: 'Safety', icon: ShieldCheck },
    { value: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-gradient-to-br from-brand-deep to-brand-teal rounded-xl flex items-center justify-center shadow-sm">
              <LifeBuoy className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Support Center</h1>
              <p className="text-sm text-muted-foreground">Get help, report issues, and stay safe</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: scrollable chips */}
          <div className="md:hidden mb-5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {tabItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setActiveTab(item.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    activeTab === item.value
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'bg-card border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop: tab bar */}
          <TabsList className="hidden md:inline-flex w-full bg-muted/60 rounded-xl p-1 h-auto mb-5">
            {tabItems.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-brand-teal data-[state=active]:shadow-sm"
              >
                <item.icon className="size-3.5" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="complaints">
            <ComplaintsTab onSwitchTab={handleSwitchTab} />
          </TabsContent>

          <TabsContent value="emergency">
            <EmergencyTab activeBookingPG={activeBookingPG} ownerInfo={ownerInfo} />
          </TabsContent>

          <TabsContent value="contact-owner">
            {bookingsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : (
              <ContactOwnerTab activeBookingPG={activeBookingPG} ownerInfo={ownerInfo} />
            )}
          </TabsContent>

          <TabsContent value="safety">
            <SafetyTab onSwitchTab={handleSwitchTab} />
          </TabsContent>

          <TabsContent value="help">
            <HelpTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
