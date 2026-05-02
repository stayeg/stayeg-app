'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, User, Phone, Edit2, Loader2, Check, HardHat, Trash2, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { BADGE, BADGE_BORDER } from '@/lib/constants';

const ROLE_COLORS: Record<string, string> = {
  SECURITY: 'bg-red-100 text-red-700',
  CLEANER: 'bg-emerald-100 text-emerald-700',
  COOK: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-violet-100 text-violet-700',
  MAINTENANCE: 'bg-sky-100 text-sky-700',
};

const ROLE_LABELS: Record<string, string> = {
  SECURITY: 'Security',
  CLEANER: 'Cleaner',
  COOK: 'Cook',
  MANAGER: 'Manager',
  MAINTENANCE: 'Maintenance',
};

const SHIFT_COLORS: Record<string, string> = {
  MORNING: 'bg-brand-teal/15 text-brand-teal',
  EVENING: 'bg-violet-100 text-violet-700',
  NIGHT: 'bg-slate-700 text-gray-200',
};

const SHIFT_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  EVENING: 'Evening',
  NIGHT: 'Night',
};

export default function WorkerManagement() {
  const { showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterPG, setFilterPG] = useState('all');
  const [editWorker, setEditWorker] = useState<{ id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', role: 'CLEANER', phone: '', pgId: '', shift: 'MORNING' });

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
    queryKey: ['owner-pgs-worker', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      return res.json();
    },
    enabled: !!ownerId,
  });

  const { data: workers, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await authFetch('/api/workers');
      if (!res.ok) throw new Error('Failed to fetch workers');
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    let result = workers || [];
    if (filterRole !== 'all') result = result.filter((w: { role: string }) => w.role === filterRole);
    if (filterPG !== 'all') result = result.filter((w: { pgId?: string }) => w.pgId === filterPG);
    return result;
  }, [workers, filterRole, filterPG]);

  const pgNameMap: Record<string, string> = {};
  (pgs || []).forEach((pg: { id: string; name: string }) => { pgNameMap[pg.id] = pg.name; });

  const resetForm = () => setForm({ name: '', role: 'CLEANER', phone: '', pgId: '', shift: 'MORNING' });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await authFetch('/api/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name, role: data.role, phone: data.phone, pgId: data.pgId || undefined, shift: data.shift }) });
      if (!res.ok) throw new Error('Failed to create worker');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workers'] }); showToast('Staff added successfully!'); setAddOpen(false); resetForm(); },
    onError: () => showToast('Failed to add staff'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await authFetch('/api/workers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id, name: data.name, role: data.role, phone: data.phone, pgId: data.pgId || undefined, shift: data.shift }) });
      if (!res.ok) throw new Error('Failed to update worker');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workers'] }); showToast('Staff updated!'); setEditOpen(false); setEditWorker(null); },
    onError: () => showToast('Failed to update staff'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/workers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete worker');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workers'] }); showToast('Staff removed!'); setDeleteOpen(false); setDeleteTarget(null); },
    onError: () => showToast('Failed to remove staff'),
  });

  const openEdit = (worker: { id: string; name: string; role: string; phone: string; pgId?: string; shift?: string }) => {
    setEditWorker(worker);
    setForm({ name: worker.name, role: worker.role, phone: worker.phone, pgId: worker.pgId || '', shift: worker.shift || 'MORNING' });
    setEditOpen(true);
  };

  const workerFormContent = (isEdit: boolean) => (
    <div className="space-y-4 pt-2">
      <div className="space-y-2"><Label>Name *</Label><Input placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Role *</Label>
          <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(ROLE_COLORS).map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Shift</Label>
          <Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(SHIFT_COLORS).map(s => <SelectItem key={s} value={s}>{SHIFT_LABELS[s] || s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>Phone *</Label><Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
      <div className="space-y-2"><Label>Assign to PG</Label>
        <Select value={form.pgId} onValueChange={v => setForm(p => ({ ...p, pgId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select PG..." /></SelectTrigger>
          <SelectContent>
            {(pgs || []).map((pg: { id: string; name: string }) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white" onClick={() => isEdit && editWorker ? updateMutation.mutate({ ...form, id: editWorker.id }) : createMutation.mutate(form)} disabled={(isEdit ? updateMutation : createMutation).isPending || !form.name || !form.phone}>
        {(isEdit ? updateMutation : createMutation).isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}{isEdit ? 'Save Changes' : 'Add Staff Member'}
      </Button>
    </div>
  );

  // Summary counts by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (workers || []).forEach((w: { role: string }) => { counts[w.role] = (counts[w.role] || 0) + 1; });
    return counts;
  }, [workers]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage your PG staff and workers</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white shadow-md">
              <Plus className="size-4 mr-2" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">{workerFormContent(false)}</DialogContent>
        </Dialog>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {Object.keys(ROLE_COLORS).map((role) => (
          <Card key={role} className="h-full">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-foreground">{roleCounts[role] || 0}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[role] || role}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterPG} onValueChange={setFilterPG}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All PGs" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All PGs</SelectItem>{(pgs || []).map((pg: { id: string; name: string }) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-muted-foreground" />
          {['all', ...Object.keys(ROLE_COLORS)].map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterRole === role
                  ? (role === 'all' ? 'bg-brand-teal/15 text-brand-teal' : ROLE_COLORS[role]) + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {role === 'all' ? 'All' : ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      </div>

      <Badge variant="outline" className="text-brand-teal border-brand-teal/20 bg-brand-teal/10 px-3 py-1.5 w-fit">
        <HardHat className="size-3.5 mr-1.5" />{filtered.length} Staff Member{filtered.length !== 1 ? 's' : ''}
      </Badge>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center"><HardHat className="size-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold text-muted-foreground">No Staff Found</h3><p className="text-sm text-muted-foreground mt-1">Add staff members to manage your PG</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((worker: { id: string; name: string; role: string; phone: string; pgId?: string; shift?: string; status: string }, index: number) => (
              <motion.div key={worker.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-brand-deep to-brand-teal p-3 rounded-xl shrink-0">
                        <User className="size-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{worker.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`${ROLE_COLORS[worker.role] || 'bg-muted text-foreground'} text-[10px]`}>{ROLE_LABELS[worker.role] || worker.role}</Badge>
                          {worker.shift && <Badge className={`${SHIFT_COLORS[worker.shift] || ''} text-[10px]`}>{SHIFT_LABELS[worker.shift] || worker.shift}</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{worker.phone}</span>
                      </div>
                      {worker.pgId && (
                        <div className="text-sm text-muted-foreground truncate">
                          Assigned: {pgNameMap[worker.pgId] || worker.pgId}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <a href={`tel:${worker.phone}`} className={`flex items-center justify-center gap-1 ${BADGE_BORDER.green} hover:opacity-80 py-2 rounded-lg text-sm font-medium transition-colors`}>
                        <Phone className="size-3.5" /> Call
                      </a>
                      <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => openEdit(worker)}>
                        <Edit2 className="size-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-9 text-destructive hover:bg-destructive/10" onClick={() => { setDeleteTarget(worker); setDeleteOpen(true); }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditWorker(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Staff Member</DialogTitle></DialogHeader>
          {workerFormContent(true)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from your staff list?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
