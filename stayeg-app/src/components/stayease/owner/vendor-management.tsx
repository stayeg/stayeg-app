'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Phone, Star, Wrench, Search, Filter, Loader2, Check, User,
  Edit2, Trash2, Mail, MapPin,
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
import { BADGE, BADGE_BORDER, CITIES } from '@/lib/constants';

const VENDOR_TYPES = [
  { value: 'PLUMBER', label: 'Plumber', color: 'bg-sky-100 text-sky-700' },
  { value: 'ELECTRICIAN', label: 'Electrician', color: 'bg-amber-100 text-amber-700' },
  { value: 'CLEANER', label: 'Cleaner', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'PAINTER', label: 'Painter', color: 'bg-violet-100 text-violet-700' },
  { value: 'CARPENTER', label: 'Carpenter', color: 'bg-orange-100 text-orange-700' },
  { value: 'WIFI', label: 'WiFi Service', color: 'bg-teal-100 text-teal-700' },
  { value: 'GENERAL', label: 'General', color: 'bg-muted text-foreground' },
];

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i < Math.floor(rating);
    const half = !filled && i < rating;
    return { filled, half };
  });
  const sizeClass = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((s, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${s.filled ? 'fill-amber-400 text-amber-400' : s.half ? 'fill-amber-200 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function VendorManagement() {
  const { showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editVendor, setEditVendor] = useState<{ id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', type: 'PLUMBER', phone: '', email: '', area: '', city: 'Bangalore' });

  const { data: ownerUser } = useQuery({
    queryKey: ['owner-user'],
    queryFn: async () => {
      const res = await authFetch('/api/auth?role=OWNER');
      if (!res.ok) throw new Error('Failed to fetch owner');
      const users = await res.json();
      return (Array.isArray(users) ? users : users.users)?.[0] || null;
    },
  });
  const ownerCity = ownerUser?.city;

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await authFetch('/api/vendors');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    let result = vendors || [];
    if (filterType !== 'all') result = result.filter((v: { type: string }) => v.type === filterType);
    if (filterCity !== 'all') result = result.filter((v: { city: string }) => v.city === filterCity);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((v: { name: string; phone: string; area?: string }) =>
        v.name.toLowerCase().includes(q) || v.phone.includes(q) || (v.area || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [vendors, filterType, filterCity, searchQuery]);

  const getTypeInfo = (type: string) => VENDOR_TYPES.find(t => t.value === type) || VENDOR_TYPES[6];

  const resetForm = () => setForm({ name: '', type: 'PLUMBER', phone: '', email: '', area: '', city: 'Bangalore' });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await authFetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create vendor');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); showToast('Vendor added successfully!'); setAddOpen(false); resetForm(); },
    onError: () => showToast('Failed to add vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await authFetch('/api/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update vendor');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); showToast('Vendor updated!'); setEditOpen(false); setEditVendor(null); },
    onError: () => showToast('Failed to update vendor'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete vendor');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); showToast('Vendor removed!'); setDeleteOpen(false); setDeleteTarget(null); },
    onError: () => showToast('Failed to remove vendor'),
  });

  const openEdit = (vendor: { id: string; name: string; type: string; phone: string; email?: string; area?: string; city?: string }) => {
    setEditVendor(vendor);
    setForm({ name: vendor.name, type: vendor.type, phone: vendor.phone, email: vendor.email || '', area: vendor.area || '', city: vendor.city || 'Bangalore' });
    setEditOpen(true);
  };

  const vendorFormContent = (isEdit: boolean) => (
    <div className="space-y-4 pt-2">
      <div className="space-y-2"><Label>Vendor Name *</Label><Input placeholder="e.g., QuickFix Plumbing" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="space-y-2"><Label>Service Type *</Label>
        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{VENDOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Phone *</Label><Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        <div className="space-y-2"><Label>City</Label>
          <Select value={form.city} onValueChange={v => setForm(p => ({ ...p, city: v }))}>
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>{CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="vendor@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
      <div className="space-y-2"><Label>Area</Label><Input placeholder="e.g., Koramangala" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
      <Button className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white" onClick={() => isEdit && editVendor ? updateMutation.mutate({ ...form, id: editVendor.id }) : createMutation.mutate(form)} disabled={(isEdit ? updateMutation : createMutation).isPending || !form.name || !form.phone}>
        {(isEdit ? updateMutation : createMutation).isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}{isEdit ? 'Save Changes' : 'Add Vendor'}
      </Button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Directory</h1>
          <p className="text-muted-foreground mt-1">Manage service providers and vendors</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white shadow-md">
              <Plus className="size-4 mr-2" /> Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">{vendorFormContent(false)}</DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, area..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Cities" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Cities</SelectItem>{CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40"><Filter className="size-4 mr-2 text-muted-foreground" /><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{VENDOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Badge variant="outline" className="text-brand-teal border-brand-teal/20 bg-brand-teal/10 px-3 py-1.5 w-fit">
        <Wrench className="size-3.5 mr-1.5" />{filtered.length} Vendor{filtered.length !== 1 ? 's' : ''}
      </Badge>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-28 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center"><Wrench className="size-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold text-muted-foreground">No Vendors Found</h3><p className="text-sm text-muted-foreground mt-1">Add vendors to your directory</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((vendor: { id: string; name: string; type: string; phone: string; email?: string; area?: string; city?: string; rating: number; status: string }, index: number) => {
              const typeInfo = getTypeInfo(vendor.type);
              return (
                <motion.div key={vendor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-brand-teal/15 p-2.5 rounded-xl shrink-0">
                            <Wrench className="size-5 text-brand-teal" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{vendor.name}</h3>
                            <Badge className={`${typeInfo.color} text-[10px] mt-1`}>{typeInfo.label}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">{vendor.rating?.toFixed(1) || '4.0'}</span>
                          <StarRating rating={vendor.rating || 4.0} />
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {(vendor.area || vendor.city) && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="truncate">{[vendor.area, vendor.city].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="size-3.5 shrink-0" />
                          <span>{vendor.phone}</span>
                        </div>
                        {vendor.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate">{vendor.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <a href={`tel:${vendor.phone}`} className={`flex items-center justify-center gap-1 ${BADGE_BORDER.green} hover:opacity-80 py-2 rounded-lg text-sm font-medium transition-colors`}>
                          <Phone className="size-3.5" /> Call
                        </a>
                        <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => openEdit(vendor)}>
                          <Edit2 className="size-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-9 text-destructive hover:bg-destructive/10" onClick={() => { setDeleteTarget(vendor); setDeleteOpen(true); }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditVendor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          {vendorFormContent(true)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Vendor</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from your vendor directory?</AlertDialogDescription>
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
