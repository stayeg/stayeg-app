'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Phone, BedDouble, Plus, Trash2, X, Check,
  Loader2, MessageSquare, ArrowRightLeft, StickyNote, Filter, UserPlus,
  ChevronDown, ChevronUp, Mail, CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { BADGE, TEXT_COLOR } from '@/lib/constants';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

interface TenantRecord {
  id: string;
  ownerId: string;
  pgId: string;
  roomId: string;
  bedId: string;
  name: string;
  phone: string;
  email?: string;
  aadhaar?: string;
  gender?: string;
  rentAmount: number;
  rentDueDay: number;
  status: string;
  notes?: string;
  joinedAt: string;
  createdAt: string;
  pg?: { id: string; name: string };
  room?: { id: string; roomCode: string; roomType: string; floor: number };
  bed?: { id: string; bedNumber: number; status: string };
  rentRecords?: { id: string; month: string; amount: number; status: string; paidDate?: string; method?: string }[];
}

interface PGData { id: string; name: string; rooms?: { id: string; roomCode: string; roomType: string; floor?: number; beds?: { id: string; bedNumber: number; status: string }[] }[] }

export default function TenantManagement() {
  const { showToast, currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPG, setFilterPG] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tenantNote, setTenantNote] = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', email: '', gender: '', aadhaar: '',
    rentAmount: '', rentDueDay: '5', pgId: '', roomId: '', bedId: '', notes: '',
  });
  const [moveTarget, setMoveTarget] = useState({ roomId: '', bedId: '' });

  const ownerId = currentUser?.id;

  const { data: pgs } = useQuery({
    queryKey: ['owner-pgs-tenants', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      return res.json();
    },
    enabled: !!ownerId,
  });
  const pgList: PGData[] = pgs || [];

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['owner-tenants', ownerId, filterPG, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ ownerId: ownerId! });
      if (filterPG !== 'all') params.set('pgId', filterPG);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await authFetch(`/api/tenants?${params}`);
      return res.json();
    },
    enabled: !!ownerId,
  });
  const tenantList: TenantRecord[] = tenants || [];

  const filteredTenants = useMemo(() => {
    if (!searchQuery) return tenantList;
    const q = searchQuery.toLowerCase();
    return tenantList.filter((t: TenantRecord) =>
      t.name.toLowerCase().includes(q) || t.phone.includes(q) || (t.email || '').toLowerCase().includes(q)
    );
  }, [tenantList, searchQuery]);

  const selectedPG = pgList.find(p => p.id === form.pgId);
  const roomsInPG = selectedPG?.rooms || [];
  const selectedRoom = roomsInPG.find(r => r.id === form.roomId);
  const bedsInRoom = selectedRoom?.beds?.filter(b => b.status === 'AVAILABLE') || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      // Step 1: Try to find an existing user by email or phone
      let userId = '';

      if (data.email) {
        const lookupRes = await authFetch(`/api/auth?email=${encodeURIComponent(data.email)}`);
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          if (lookupData.user) userId = lookupData.user.id;
        }
      }

      if (!userId && data.phone) {
        const lookupRes = await authFetch(`/api/auth?phone=${encodeURIComponent(data.phone)}`);
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          if (lookupData.user) userId = lookupData.user.id;
        }
      }

      // Step 2: If no existing user found, create a new one
      if (!userId && (data.name || data.phone || data.email)) {
        const createRes = await authFetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email || undefined,
            phone: data.phone,
            role: 'TENANT',
            gender: data.gender || undefined,
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || 'Failed to create user');
        }
        const createData = await createRes.json();
        userId = createData.user.id;
      }

      if (!userId) throw new Error('Could not determine tenant user. Please provide a name and phone.');

      // Step 3: Create the booking with the real userId
      const body: Record<string, unknown> = {
        userId,
        pgId: data.pgId,
        bedId: data.bedId,
        checkInDate: new Date().toISOString(),
        advancePaid: 0,
        ownerId,
      };
      if (data.notes?.trim()) body.notes = data.notes.trim();

      const res = await authFetch('/api/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add tenant'); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['owner-tenants'] }); queryClient.invalidateQueries({ queryKey: ['owner-analytics'] }); toast.success('Tenant added successfully!'); setAddOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/tenants?bookingId=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove tenant');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['owner-tenants'] }); queryClient.invalidateQueries({ queryKey: ['owner-analytics'] }); toast.success('Tenant removed'); setDeleteOpen(false); setSelectedTenant(null); },
    onError: () => toast.error('Failed to remove tenant'),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ bookingId, newBedId }: { bookingId: string; newBedId: string }) => {
      const res = await authFetch('/api/tenants', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, newBedId }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to move'); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['owner-tenants'] }); toast.success('Tenant moved!'); setMoveOpen(false); setSelectedTenant(null); },
    onError: (e) => toast.error(e.message),
  });

  const notesMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      const res = await authFetch('/api/tenants', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId, notes }) });
      if (!res.ok) throw new Error('Failed to update notes');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['owner-tenants'] }); toast.success('Notes saved!'); setNoteOpen(false); },
    onError: () => toast.error('Failed to save notes'),
  });

  const resetForm = () => setForm({ name: '', phone: '', email: '', gender: '', aadhaar: '', rentAmount: '', rentDueDay: '5', pgId: '', roomId: '', bedId: '', notes: '' });
  const openMoveDialog = (t: TenantRecord) => { setSelectedTenant(t); setMoveTarget({ roomId: '', bedId: '' }); setMoveOpen(true); };
  const openNoteDialog = (t: TenantRecord) => { setSelectedTenant(t); setTenantNote(t.notes || ''); setNoteOpen(true); };

  const movePG = pgList.find(p => p.id === selectedTenant?.pgId);
  const moveRooms = movePG?.rooms || [];
  const moveSelectedRoom = moveRooms.find(r => r.id === moveTarget.roomId);
  const moveBeds = moveSelectedRoom?.beds?.filter(b => b.status === 'AVAILABLE' || b.id === selectedTenant?.bedId) || [];

  const getRentStatus = (tenant: TenantRecord) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const record = tenant.rentRecords?.find(r => r.month === currentMonth);
    if (!record) return 'NO_RECORD';
    return record.status;
  };

  const statusBadge = (status: string) => {
    switch (status) { case 'ACTIVE': return BADGE.green; case 'INACTIVE': return BADGE.yellow; case 'EVICTED': return BADGE.red; default: return 'bg-gray-100 text-gray-700'; }
  };

  const rentStatusBadge = (status: string) => {
    switch (status) { case 'PAID': return BADGE.green; case 'PENDING': return BADGE.yellow; case 'OVERDUE': return BADGE.red; default: return 'bg-gray-100 text-gray-700'; }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">Add, manage, and communicate with tenants</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white shadow-md">
              <UserPlus className="size-4 mr-2" /> Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Tenant</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone *</Label><Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Monthly Rent (&#8377;) *</Label><Input type="number" placeholder="8000" value={form.rentAmount} onChange={e => setForm(p => ({ ...p, rentAmount: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Rent Due Day</Label>
                  <Select value={form.rentDueDay} onValueChange={v => setForm(p => ({ ...p, rentDueDay: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,5,10,15,20,25].map(d => <SelectItem key={d} value={String(d)}>{d}th of month</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <p className="text-sm font-semibold text-foreground">Assign to Bed *</p>
              <div className="space-y-3">
                <div className="space-y-2"><Label>PG</Label>
                  <Select value={form.pgId} onValueChange={v => setForm(p => ({ ...p, pgId: v, roomId: '', bedId: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select PG" /></SelectTrigger>
                    <SelectContent>{pgList.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.pgId && <div className="space-y-2"><Label>Room</Label>
                  <Select value={form.roomId} onValueChange={v => setForm(p => ({ ...p, roomId: v, bedId: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                    <SelectContent>{roomsInPG.map(room => <SelectItem key={room.id} value={room.id}>{room.roomCode} - {room.roomType}{room.floor != null ? ` (F${room.floor})` : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>}
                {form.roomId && <div className="space-y-2"><Label>Available Bed</Label>
                  {bedsInRoom.length > 0 ? <Select value={form.bedId} onValueChange={v => setForm(p => ({ ...p, bedId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Bed" /></SelectTrigger>
                    <SelectContent>{bedsInRoom.map(bed => <SelectItem key={bed.id} value={bed.id}>Bed #{bed.bedNumber}</SelectItem>)}</SelectContent>
                  </Select> : <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">No available beds in this room</p>}
                </div>}
              </div>
              <Button className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.phone || !form.bedId || !form.pgId}>
                {createMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}Add Tenant
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterPG} onValueChange={setFilterPG}>
          <SelectTrigger className="w-full sm:w-48"><Filter className="size-4 mr-2 text-muted-foreground" /><SelectValue placeholder="All PGs" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All PGs</SelectItem>{pgList.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
        </Select>
      </div>

      <Badge variant="outline" className="text-brand-teal border-brand-teal/20 bg-brand-teal/10 px-3 py-1.5 w-fit">
        <Users className="size-3.5 mr-1.5" />{filteredTenants.length} Tenant{filteredTenants.length !== 1 ? 's' : ''}
      </Badge>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filteredTenants.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Users className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Tenants Found</h3>
          <p className="text-sm text-muted-foreground mt-1">{pgList.length === 0 ? 'Add a PG property first, then add tenants' : 'Click &quot;Add Tenant&quot; to get started'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant: TenantRecord, index: number) => {
            const rentStatus = getRentStatus(tenant);
            const isExpanded = expandedTenant === tenant.id;
            return (
              <motion.div key={tenant.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 shrink-0">
                        <AvatarFallback className="bg-brand-teal/15 text-brand-teal font-semibold text-sm">{tenant.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                          <Badge className={statusBadge(tenant.status)}>{tenant.status}</Badge>
                          <Badge className={rentStatusBadge(rentStatus)}>
                            {rentStatus === 'PAID' ? 'Rent Paid' : rentStatus === 'PENDING' ? 'Pending' : rentStatus === 'OVERDUE' ? 'Overdue' : 'No Record'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Phone className="size-3" />{tenant.phone}</span>
                          {tenant.pg && <span>{tenant.pg.name}</span>}
                          {tenant.room && tenant.bed && <span className="flex items-center gap-1"><BedDouble className="size-3" />{tenant.room.roomCode}-#{tenant.bed.bedNumber}</span>}
                          <span className={`font-medium ${TEXT_COLOR.greenLight}`}>{formatCurrency(tenant.rentAmount)}/mo</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {tenant.phone && (
                          <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${tenant.name}, this is regarding your stay at our PG. - ${currentUser?.name || 'StayEg Owner'}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors" title="WhatsApp"><MessageSquare className="size-3.5" /></a>
                        )}
                        <button onClick={() => openNoteDialog(tenant)} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors" title="Notes"><StickyNote className="size-3.5" /></button>
                        <button onClick={() => openMoveDialog(tenant)} className="p-2 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors" title="Move bed"><ArrowRightLeft className="size-3.5" /></button>
                        <button onClick={() => { setSelectedTenant(tenant); setDeleteOpen(true); }} className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors" title="Remove"><Trash2 className="size-3.5" /></button>
                        <button onClick={() => setExpandedTenant(isExpanded ? null : tenant.id)} className="p-2 rounded-lg hover:bg-muted transition-colors">{isExpanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}</button>
                      </div>
                    </div>
                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <Separator className="my-3" />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Email</span><p className="font-medium truncate">{tenant.email || 'N/A'}</p></div>
                            <div><span className="text-muted-foreground">PG</span><p className="font-medium">{tenant.pg?.name || 'N/A'}</p></div>
                            <div><span className="text-muted-foreground">Room / Bed</span><p className="font-medium">{tenant.room?.roomCode} - #{tenant.bed?.bedNumber}</p></div>
                            <div><span className="text-muted-foreground">Due Day</span><p className="font-medium">{tenant.rentDueDay}th of month</p></div>
                            <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{formatDate(tenant.joinedAt)}</p></div>
                            <div><span className="text-muted-foreground">Notes</span><p className="font-medium truncate">{tenant.notes || 'None'}</p></div>
                          </div>
                          {tenant.rentRecords && tenant.rentRecords.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-semibold mb-2">Rent History</p>
                              <div className="space-y-1.5">
                                {tenant.rentRecords.map(record => (
                                  <div key={record.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                                    <span className="text-muted-foreground">{record.month}</span>
                                    <span className="font-medium">{formatCurrency(record.amount)}</span>
                                    <Badge className={rentStatusBadge(record.status)}>{record.status}</Badge>
                                    {record.paidDate && <span className="text-xs text-muted-foreground">{formatDate(record.paidDate)}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Tenant</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove <strong>{selectedTenant?.name}</strong>? Their bed will be marked as available.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (selectedTenant) deleteMutation.mutate((selectedTenant as any).booking_id || selectedTenant.id); }} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Tenant Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Move Tenant to Another Bed</DialogTitle></DialogHeader>
          {selectedTenant && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Moving <strong>{selectedTenant.name}</strong> from {selectedTenant.room?.roomCode} - #{selectedTenant.bed?.bedNumber}</p>
              <div className="space-y-2"><Label>Target Room</Label>
                <Select value={moveTarget.roomId} onValueChange={v => setMoveTarget({ roomId: v, bedId: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                  <SelectContent>{moveRooms.map(room => <SelectItem key={room.id} value={room.id}>{room.roomCode} - {room.roomType}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {moveTarget.roomId && <div className="space-y-2"><Label>Available Bed</Label>
                {moveBeds.length > 0 ? <Select value={moveTarget.bedId} onValueChange={v => setMoveTarget(p => ({ ...p, bedId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Bed" /></SelectTrigger>
                  <SelectContent>{moveBeds.map(bed => <SelectItem key={bed.id} value={bed.id}>Bed #{bed.bedNumber} {bed.id === selectedTenant.bedId ? '(current)' : ''}</SelectItem>)}</SelectContent>
                </Select> : <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">No available beds</p>}
              </div>}
              <Button className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white" onClick={() => moveMutation.mutate({ bookingId: (selectedTenant as any).booking_id || selectedTenant.id, newBedId: moveTarget.bedId })} disabled={moveMutation.isPending || !moveTarget.bedId || moveTarget.bedId === selectedTenant.bedId}>
                {moveMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ArrowRightLeft className="size-4 mr-2" />}Move Tenant
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Owner Notes</DialogTitle></DialogHeader>
          {selectedTenant && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Notes for <strong>{selectedTenant.name}</strong></p>
              <Textarea placeholder="Add notes about this tenant..." rows={5} value={tenantNote} onChange={e => setTenantNote(e.target.value)} />
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" onClick={() => notesMutation.mutate({ bookingId: (selectedTenant as any).booking_id || selectedTenant.id, notes: tenantNote })} disabled={notesMutation.isPending}>
                {notesMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <StickyNote className="size-4 mr-2" />}Save Notes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
