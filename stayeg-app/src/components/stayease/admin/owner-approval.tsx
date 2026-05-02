'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Clock, AlertCircle, Check, X,
  User as UserIcon, Mail, Phone, MapPin, Briefcase,
  RefreshCw, ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { authFetch } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_SECRET = 'stayeg-v1.2-secure-2025';

interface OwnerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  gender: string;
  is_verified: boolean;
  is_approved: boolean;
  city: string;
  occupation: string;
  bio: string;
  created_at: string;
  rejection_reason?: string;
}

interface ApprovalData {
  demo: boolean;
  pending: OwnerUser[];
  approved: OwnerUser[];
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

export default function OwnerApproval() {
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/approve-owner', {
        headers: { 'x-admin-secret': ADMIN_SECRET },
      });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ demo: true, pending: [], approved: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch('/api/admin/approve-owner', {
        headers: { 'x-admin-secret': ADMIN_SECRET },
      });
      if (cancelled) return;
      try {
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ demo: true, pending: [], approved: [] });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAction = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(userId);
    try {
      const res = await authFetch('/api/admin/approve-owner', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET,
        },
        body: JSON.stringify({ userId, action, reason }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchOwners();
        if (action === 'approve') {
          // Approved
        } else {
          // Rejected
        }
      }
    } catch {
      // Error handling
    }
    setActionLoading(null);
    setRejectDialogOpen(null);
    setRejectReason('');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const pendingCount = data?.pending.length ?? 0;
  const approvedCount = data?.approved.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-brand-teal/5 to-background">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-gradient-to-br from-brand-deep to-brand-teal rounded-2xl flex items-center justify-center shadow-lg shadow-brand-teal/20">
                <Shield className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Owner Approval</h1>
                <p className="text-sm text-muted-foreground">Review and manage PG Owner signups</p>
              </div>
            </div>
            <Button
              onClick={fetchOwners}
              disabled={loading}
              variant="outline"
              className="gap-2 border-border"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6"
        >
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Check className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-brand-teal/15 flex items-center justify-center">
                  <Users className="size-5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount + approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Total Owners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex bg-muted rounded-xl p-1 mb-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-card text-amber-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="size-4" />
            Pending
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'approved'
                ? 'bg-card text-emerald-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Check className="size-4" />
            Approved
            {approvedCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {approvedCount}
              </span>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Demo Mode Notice */}
        {data?.demo && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Database not connected. Showing demo mode. Connect Supabase to manage real owner approvals.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Owner Cards */}
        {!loading && data && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(activeTab === 'pending' ? data.pending : data.approved).length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-border">
                    <CardContent className="p-8 text-center">
                      <div className="inline-flex items-center justify-center size-16 bg-muted rounded-2xl mb-3">
                        {activeTab === 'pending' ? (
                          <Clock className="size-7 text-muted-foreground" />
                        ) : (
                          <Users className="size-7 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-foreground font-medium">
                        {activeTab === 'pending' ? 'No pending approvals' : 'No approved owners yet'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeTab === 'pending'
                          ? 'All owner signups have been reviewed'
                          : 'Approved owners will appear here'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                (activeTab === 'pending' ? data.pending : data.approved).map((owner) => (
                  <motion.div
                    key={owner.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-border overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        {/* Main Row */}
                        <div className="p-4">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Avatar */}
                            <div className="shrink-0">
                              <div className="size-12 rounded-full bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-teal/20">
                                {owner.name.charAt(0).toUpperCase()}
                              </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-foreground truncate">{owner.name}</h3>
                                <Badge
                                  variant={activeTab === 'pending' ? 'outline' : 'default'}
                                  className={
                                    activeTab === 'pending'
                                      ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                                      : 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
                                  }
                                >
                                  {activeTab === 'pending' ? 'Pending' : 'Approved'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                <Mail className="size-3.5 shrink-0" />
                                <span className="truncate">{owner.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                                <Phone className="size-3.5 shrink-0" />
                                <span>{owner.phone || 'Not provided'}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Applied {formatDate(owner.created_at)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 shrink-0">
                              {activeTab === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAction(owner.id, 'approve')}
                                    disabled={actionLoading === owner.id}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-medium"
                                  >
                                    {actionLoading === owner.id ? (
                                      <RefreshCw className="size-3 animate-spin" />
                                    ) : (
                                      <Check className="size-3.5" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRejectDialogOpen(owner.id)}
                                    disabled={actionLoading === owner.id}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 gap-1.5 h-8 text-xs font-medium"
                                  >
                                    <X className="size-3.5" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleExpand(owner.id)}
                                className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {expandedId === owner.id ? (
                                  <ChevronUp className="size-3.5" />
                                ) : (
                                  <ChevronDown className="size-3.5" />
                                )}
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {expandedId === owner.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Separator />
                              <div className="p-4 bg-muted/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {owner.city && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="size-4 shrink-0 text-brand-teal" />
                                      <span>{owner.city}</span>
                                    </div>
                                  )}
                                  {owner.occupation && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Briefcase className="size-4 shrink-0 text-brand-teal" />
                                      <span>{owner.occupation}</span>
                                    </div>
                                  )}
                                  {owner.gender && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <UserIcon className="size-4 shrink-0 text-brand-teal" />
                                      <span className="capitalize">{owner.gender}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Shield className="size-4 shrink-0 text-brand-teal" />
                                    <span>ID: {owner.id.slice(0, 8)}...</span>
                                  </div>
                                </div>
                                {owner.bio && (
                                  <div className="mt-3 p-3 bg-card rounded-xl border border-border">
                                    <p className="text-sm text-foreground leading-relaxed">{owner.bio}</p>
                                  </div>
                                )}
                                {owner.rejection_reason && (
                                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <AlertCircle className="size-4 text-red-500" />
                                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">Rejection Reason</span>
                                    </div>
                                    <p className="text-sm text-red-700 dark:text-red-300">{owner.rejection_reason}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Reject Dialog */}
                        <AnimatePresence>
                          {rejectDialogOpen === owner.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Separator />
                              <div className="p-4 bg-red-50/50 dark:bg-red-950/10">
                                <div className="flex items-center gap-2 mb-3">
                                  <AlertCircle className="size-5 text-red-500" />
                                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                    Reject {owner.name}&apos;s application?
                                  </p>
                                </div>
                                <Textarea
                                  placeholder="Provide a reason for rejection (optional)..."
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="min-h-[80px] mb-3 border-red-200 dark:border-red-900/30 focus:border-red-400 focus:ring-red-200 dark:focus:ring-red-900/30 text-sm"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setRejectDialogOpen(null); setRejectReason(''); }}
                                    className="text-xs"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAction(owner.id, 'reject', rejectReason || undefined)}
                                    disabled={actionLoading === owner.id}
                                    className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs"
                                  >
                                    {actionLoading === owner.id ? (
                                      <RefreshCw className="size-3 animate-spin" />
                                    ) : (
                                      <X className="size-3.5" />
                                    )}
                                    Confirm Reject
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
