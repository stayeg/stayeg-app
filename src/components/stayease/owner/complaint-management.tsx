'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Check, Loader2, MessageSquare, Clock, ArrowRight,
  UserPlus, Filter, ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { STATUSES, BADGE, CARD_BG, TEXT_COLOR } from '@/lib/constants';

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  URGENT: { color: TEXT_COLOR.red, bg: BADGE.red, dot: 'bg-red-500' },
  HIGH: { color: 'text-amber-700', bg: BADGE.amber, dot: 'bg-amber-500' },
  MEDIUM: { color: TEXT_COLOR.yellow, bg: BADGE.yellow, dot: 'bg-yellow-500' },
  LOW: { color: TEXT_COLOR.green, bg: BADGE.green, dot: 'bg-emerald-500' },
};

const CATEGORIES = ['MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'GENERAL'];

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ComplaintManagement() {
  const { showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<{ id: string; title: string } | null>(null);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [activeTab, setActiveTab] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const { data: ownerUser } = useQuery({
    queryKey: ['owner-user'],
    queryFn: async () => {
      const res = await authFetch('/api/auth?role=OWNER');
      if (!res.ok) throw new Error('Failed to fetch owner');
      const users = await res.json();
      return (Array.isArray(users) ? users : users.users)?.[0] || null;
    },
  });
  const ownerId = ownerUser?.id;

  const { data: pgs } = useQuery({
    queryKey: ['owner-pgs-complaints', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      return res.json();
    },
    enabled: !!ownerId,
  });
  const pgIds = (pgs || []).map((p: { id: string }) => p.id);

  const { data: workers } = useQuery({
    queryKey: ['workers-all'],
    queryFn: async () => {
      const res = await authFetch('/api/workers');
      return res.json();
    },
  });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['owner-complaints-list', pgIds.join(',')],
    queryFn: async () => {
      if (pgIds.length === 0) return [];
      const results = await Promise.all(
        pgIds.map((id: string) => authFetch(`/api/complaints?pgId=${id}`).then(r => r.json()))
      );
      return results.flat();
    },
    enabled: pgIds.length > 0,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, resolution: res, assignedTo }: { id: string; status: string; resolution?: string; assignedTo?: string }) => {
      const body: Record<string, string> = { id, status };
      if (res) body.resolution = res;
      if (assignedTo) body.assignedTo = assignedTo;
      const resp = await authFetch('/api/complaints', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!resp.ok) throw new Error('Failed to update complaint');
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-complaints-list'] });
      showToast('Complaint updated!');
      setResolveDialog(false);
      setResolution('');
    },
    onError: () => showToast('Failed to update complaint'),
  });

  const handleUpdate = (complaint: { id: string; title: string }, status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') {
      setSelectedComplaint(complaint);
      setNewStatus(status);
      setResolveDialog(true);
    } else {
      updateMutation.mutate({ id: complaint.id, status });
    }
  };

  const handleAssign = (complaint: { id: string }, workerId: string) => {
    updateMutation.mutate({ id: complaint.id, status: 'IN_PROGRESS', assignedTo: workerId });
  };

  const filtered = useMemo(() => {
    let result = complaints || [];
    if (activeTab !== 'all') {
      result = result.filter((c: { status: string }) => c.status === activeTab);
    }
    if (filterPriority !== 'all') {
      result = result.filter((c: { priority: string }) => c.priority === filterPriority);
    }
    if (filterCategory !== 'all') {
      result = result.filter((c: { category: string }) => c.category === filterCategory);
    }
    return result;
  }, [complaints, activeTab, filterPriority, filterCategory]);

  const openCount = (complaints || []).filter((c: { status: string }) => c.status === 'OPEN').length;
  const inProgressCount = (complaints || []).filter((c: { status: string }) => c.status === 'IN_PROGRESS').length;
  const resolvedCount = (complaints || []).filter((c: { status: string }) => c.status === 'RESOLVED').length;
  const closedCount = (complaints || []).filter((c: { status: string }) => c.status === 'CLOSED').length;

  const pgNameMap: Record<string, string> = {};
  (pgs || []).forEach((pg: { id: string; name: string }) => { pgNameMap[pg.id] = pg.name; });

  const statusColor = (status: string) => STATUSES.COMPLAINT[status as keyof typeof STATUSES.COMPLAINT]?.color || 'bg-muted text-foreground';
  const statusLabel = (status: string) => STATUSES.COMPLAINT[status as keyof typeof STATUSES.COMPLAINT]?.label || status;
  const priorityConfig = (priority: string) => PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;

  const statusFlow = (currentStatus: string): { status: string; label: string }[] => {
    switch (currentStatus) {
      case 'OPEN': return [{ status: 'IN_PROGRESS', label: 'Start' }, { status: 'RESOLVED', label: 'Resolve' }, { status: 'CLOSED', label: 'Close' }];
      case 'IN_PROGRESS': return [{ status: 'RESOLVED', label: 'Resolve' }, { status: 'CLOSED', label: 'Close' }];
      case 'RESOLVED': return [{ status: 'CLOSED', label: 'Close' }];
      default: return [];
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Complaint Management</h1>
        <p className="text-muted-foreground mt-1">Handle tenant complaints and issues</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: (complaints || []).length, bg: 'bg-muted', color: 'text-foreground' },
          { label: 'Open', count: openCount, bg: CARD_BG.red, color: TEXT_COLOR.red },
          { label: 'In Progress', count: inProgressCount, bg: CARD_BG.yellow, color: TEXT_COLOR.yellow },
          { label: 'Resolved/Closed', count: resolvedCount + closedCount, bg: CARD_BG.green, color: TEXT_COLOR.green },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full"><CardContent className="p-4 text-center"><p className={`text-2xl font-bold ${card.color}`}>{card.count}</p><p className="text-sm text-muted-foreground">{card.label}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Tab-based View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList className="grid grid-cols-5 w-full sm:w-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({(complaints || []).length})</TabsTrigger>
            <TabsTrigger value="OPEN" className="text-xs sm:text-sm">Open ({openCount})</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS" className="text-xs sm:text-sm">In Progress ({inProgressCount})</TabsTrigger>
            <TabsTrigger value="RESOLVED" className="text-xs sm:text-sm">Resolved ({resolvedCount})</TabsTrigger>
            <TabsTrigger value="CLOSED" className="text-xs sm:text-sm">Closed ({closedCount})</TabsTrigger>
          </TabsList>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-40"><Filter className="size-4 mr-2 text-muted-foreground" /><SelectValue placeholder="All Priority" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="URGENT">Urgent</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="LOW">Low</SelectItem></SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Category</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed"><CardContent className="p-12 text-center">
                <MessageSquare className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No Complaints</h3>
                <p className="text-sm text-muted-foreground mt-1">All clear! No complaints to handle.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3 mt-2">
                <AnimatePresence>
                  {filtered.map((c: { id: string; title: string; description?: string; category: string; priority: string; status: string; user?: { name: string; avatar?: string }; pgId: string; createdAt: string; resolution?: string; assignedTo?: string }, index: number) => {
                    const pConfig = priorityConfig(c.priority);
                    const nextActions = statusFlow(c.status);
                    const isUrgent = c.priority === 'URGENT';
                    return (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                        <Card className={`hover:shadow-md transition-all ${isUrgent ? 'border-red-200' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`size-3 rounded-full mt-1.5 shrink-0 ${pConfig.dot}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-foreground truncate">{c.title}</h3>
                                  <Badge className={`${statusColor(c.status)} text-[10px]`}>{statusLabel(c.status)}</Badge>
                                  <Badge className={`${pConfig.bg} ${pConfig.color} text-[10px]`}>{c.priority}</Badge>
                                  <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
                                  <span>{c.user?.name || 'Tenant'}</span>
                                  <span>&bull;</span>
                                  <span>{pgNameMap[c.pgId] || 'PG'}</span>
                                  <span>&bull;</span>
                                  <span className="flex items-center gap-1"><Clock className="size-3" />{formatDate(c.createdAt)}</span>
                                  {c.assignedTo && <span>&bull; Assigned</span>}
                                </div>
                                {c.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            {nextActions.length > 0 && (
                              <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                                {c.status === 'OPEN' && (workers || []).length > 0 && (
                                  <Select onValueChange={(v) => handleAssign(c, v)}>
                                    <SelectTrigger className="w-40 h-7 text-xs">
                                      <UserPlus className="size-3 mr-1" />
                                      <SelectValue placeholder="Assign worker..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(workers || []).map((w: { id: string; name: string; role: string }) => (
                                        <SelectItem key={w.id} value={w.id}>{w.name} ({w.role})</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                {nextActions.map(action => (
                                  <Button
                                    key={action.status}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7"
                                    onClick={() => handleUpdate(c, action.status)}
                                  >
                                    <ChevronRight className="size-3 mr-1" />
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}

                            {/* Resolution */}
                            {c.resolution && (
                              <div className={`mt-3 ${CARD_BG.green} border border-green-200 rounded-lg p-3`}>
                                <p className={`text-sm font-medium ${TEXT_COLOR.green}`}>Resolution:</p>
                                <p className={`text-sm ${TEXT_COLOR.green} mt-1`}>{c.resolution}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedComplaint && (
              <p className="text-sm text-muted-foreground">
                Resolving: <strong>{selectedComplaint.title}</strong>
              </p>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution Note *</Label>
              <Textarea placeholder="Describe how the issue was resolved..." value={resolution} onChange={e => setResolution(e.target.value)} rows={4} />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { if (selectedComplaint && resolution) updateMutation.mutate({ id: selectedComplaint.id, status: newStatus, resolution }); }} disabled={updateMutation.isPending || !resolution}>
              {updateMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}Submit Resolution
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
