'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  MessageSquare,
  Plus,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  Sparkles,
  Volume2,
  Shield,
  CircleHelp,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { STATUSES, BADGE } from '@/lib/constants';
import type { Complaint } from '@/lib/types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  MAINTENANCE: Wrench,
  CLEANLINESS: Sparkles,
  NOISE: Volume2,
  SAFETY: Shield,
  GENERAL: CircleHelp,
};

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance',
  CLEANLINESS: 'Cleanliness',
  NOISE: 'Noise',
  SAFETY: 'Safety',
  GENERAL: 'General',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: BADGE.blue,
  MEDIUM: 'bg-brand-sage/10 text-brand-sage',
  HIGH: 'bg-brand-teal/15 text-brand-teal',
  URGENT: BADGE.red,
};

const TIMELINE_STEPS = [
  { status: 'OPEN', label: 'Submitted', icon: Send },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { status: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
  { status: 'CLOSED', label: 'Closed', icon: CheckCircle2 },
];

export default function ComplaintSection() {
  const { currentUser, showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL' as string,
    priority: 'MEDIUM' as string,
  });

  const { data: complaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ['complaints', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const res = await authFetch(`/api/complaints?userId=${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch complaints');
      return res.json();
    },
    enabled: !!currentUser?.id,
  });

  const stats = useMemo(() => {
    const open = complaints.filter((c) => c.status === 'OPEN').length;
    const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    return { open, inProgress, resolved };
  }, [complaints]);

  const handleSubmit = async () => {
    if (!formData.title || !currentUser?.id) return;

    const selectedPG = useAppStore.getState().selectedPG;
    if (!selectedPG?.id) {
      showToast('Please select a PG first');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          pgId: selectedPG.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
        }),
      });
      if (!res.ok) {
        showToast('Failed to submit complaint. Please try again.');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setFormData({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' });
      setShowForm(false);
      showToast('Complaint submitted successfully!');
    } catch {
      showToast('Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepStatus = (complaint: Complaint, stepStatus: string) => {
    const order = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const currentIndex = order.indexOf(complaint.status);
    const stepIndex = order.indexOf(stepStatus);
    if (stepIndex <= currentIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-brand-teal/15 rounded-xl flex items-center justify-center">
                <MessageSquare className="size-5 text-brand-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Complaints</h1>
                <p className="text-sm text-muted-foreground">Report issues and track resolutions</p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white gap-2"
            >
              {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
              {showForm ? 'Cancel' : 'Raise Complaint'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Raise Complaint Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <Card className="border-0 shadow-sm border-l-4 border-l-brand-teal">
                <CardHeader>
                  <CardTitle className="text-lg">Raise a New Complaint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="complaint-title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="complaint-title"
                      placeholder="Briefly describe your issue"
                      value={formData.title}
                      onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {label}
                              </span>
                            </SelectItem>
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

                  <div className="space-y-2">
                    <Label htmlFor="complaint-desc">Description</Label>
                    <Textarea
                      id="complaint-desc"
                      placeholder="Provide more details about the issue..."
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.title || isSubmitting}
                    className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Submit Complaint
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats */}
        {!isLoading && complaints.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Open', count: stats.open, color: 'text-destructive', bg: 'bg-destructive/10' },
              { label: 'In Progress', count: stats.inProgress, color: 'text-brand-sage', bg: 'bg-brand-sage/10' },
              { label: 'Resolved', count: stats.resolved, color: 'text-brand-lime', bg: 'bg-brand-lime/15' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 border shadow-sm text-center"
              >
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Complaints List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : complaints.length === 0 && !showForm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4"
          >
            <div className="size-16 rounded-full bg-brand-lime/15 flex items-center justify-center mb-4">
              <MessageSquare className="size-8 text-brand-lime" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No complaints. Everything looks good!</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Facing an issue? Let us know and we&apos;ll help resolve it quickly.
            </p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-brand-teal hover:bg-brand-deep text-white"
            >
              <Plus className="size-4" />
              Raise Complaint
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {complaints.map((complaint, index) => {
                const statusConfig = STATUSES.COMPLAINT[complaint.status as keyof typeof STATUSES.COMPLAINT];
                const CatIcon = CATEGORY_ICONS[complaint.category] || CircleHelp;
                const isExpanded = expandedId === complaint.id;

                return (
                  <motion.div
                    key={complaint.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <CardContent className="p-0">
                        {/* Main Row */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                          className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="size-10 bg-brand-teal/10 rounded-xl flex items-center justify-center shrink-0">
                            <CatIcon className="size-5 text-brand-teal" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground text-sm truncate">
                                {complaint.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="capitalize">{CATEGORY_LABELS[complaint.category] || complaint.category}</span>
                              <span>•</span>
                              <span>{format(new Date(complaint.createdAt), 'dd MMM yyyy')}</span>
                              {complaint.pg && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px]">{complaint.pg.name}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`text-xs ${statusConfig?.color || ''}`}>
                              {statusConfig?.label || complaint.status}
                            </Badge>
                            <Badge className={`text-xs ${PRIORITY_COLORS[complaint.priority] || ''}`}>
                              {complaint.priority}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground" />
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
                                {/* Description */}
                                {complaint.description && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                      Description
                                    </h4>
                                    <p className="text-sm text-foreground">{complaint.description}</p>
                                  </div>
                                )}

                                {/* Resolution */}
                                {complaint.resolution && (
                                  <div className="bg-brand-lime/15 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-brand-lime uppercase tracking-wider mb-1">
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
                                  <div className="flex items-center gap-0">
                                    {TIMELINE_STEPS.map((step, i) => {
                                      const stepState = getStepStatus(complaint, step.status);
                                      const StepIcon = step.icon;
                                      return (
                                        <div key={step.status} className="flex items-center flex-1">
                                          <div className="flex flex-col items-center">
                                            <div
                                              className={`size-8 rounded-full flex items-center justify-center ${
                                                stepState === 'completed'
                                                  ? 'bg-brand-lime/20 text-brand-lime'
                                                  : 'bg-muted text-muted-foreground'
                                              }`}
                                            >
                                              <StepIcon className="size-4" />
                                            </div>
                                            <span
                                              className={`text-[10px] mt-1 ${
                                                stepState === 'completed'
                                                  ? 'text-brand-lime font-medium'
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
                                                  ? 'bg-brand-lime/30'
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
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
