'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Building2, MapPin, Star, BedDouble, ChevronDown, ChevronUp, X, Check, Loader2,
  Trash2, Search, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { AMENITIES_LIST, STATUSES, BADGE, CITIES } from '@/lib/constants';
import type { PG } from '@/lib/types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function PGManagement() {
  const { showToast, setSelectedPG, currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedPG, setExpandedPG] = useState<string | null>(null);
  const [editPG, setEditPG] = useState<PG | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PG | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    name: '', address: '', city: 'Bangalore', gender: 'UNISEX' as string,
    price: '', securityDeposit: '', description: '', amenities: [] as string[], images: '',
  });

  const ownerId = currentUser?.id;

  const { data: pgs, isLoading } = useQuery({
    queryKey: ['owner-pgs', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      if (!res.ok) throw new Error('Failed to fetch PGs');
      return res.json();
    },
    enabled: !!ownerId,
  });

  const filteredPGs = useMemo(() => {
    if (!pgs) return [];
    let result = [...pgs];
    if (filterStatus !== 'all') {
      result = result.filter((pg: PG) => pg.status === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((pg: PG) =>
        pg.name.toLowerCase().includes(q) || pg.address.toLowerCase().includes(q) || pg.city.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pgs, filterStatus, searchQuery]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await authFetch('/api/pgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ownerId,
          price: Number(data.price) || 0,
          securityDeposit: Number(data.securityDeposit) || 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to create PG');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-pgs'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics'] });
      showToast('PG created successfully!');
      setAddOpen(false);
      setForm({ name: '', address: '', city: 'Bangalore', gender: 'UNISEX', price: '', securityDeposit: '', description: '', amenities: [], images: '' });
    },
    onError: () => showToast('Failed to create PG'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await authFetch('/api/pgs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          name: data.name,
          address: data.address,
          city: data.city,
          gender: data.gender,
          price: Number(data.price) || 0,
          securityDeposit: Number(data.securityDeposit) || 0,
          description: data.description,
          amenities: data.amenities,
        }),
      });
      if (!res.ok) throw new Error('Failed to update PG');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-pgs'] });
      showToast('PG updated successfully!');
      setEditOpen(false);
      setEditPG(null);
    },
    onError: () => showToast('Failed to update PG'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/pgs?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete PG');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-pgs'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics'] });
      showToast('PG deleted successfully!');
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
    onError: () => showToast('Failed to delete PG'),
  });

  const toggleAmenity = (amenityId: string) => {
    setForm(prev => {
      const raw = prev.amenities as unknown;
      const list = Array.isArray(raw) ? raw :
        typeof raw === 'string' ? (raw as string).split(',').filter(Boolean) : [];
      return {
        ...prev,
        amenities: list.includes(amenityId)
          ? list.filter(a => a !== amenityId)
          : [...list, amenityId],
      };
    });
  };

  const openEdit = (pg: PG) => {
    setEditPG(pg);
    setForm({
      name: pg.name,
      address: pg.address,
      city: pg.city,
      gender: pg.gender,
      price: String(pg.price),
      securityDeposit: String(pg.securityDeposit),
      description: pg.description || '',
      amenities: typeof pg.amenities === 'string' ? pg.amenities.split(',').filter(Boolean) : pg.amenities || [],
      images: typeof pg.images === 'string' ? pg.images : String((pg.images || [])).split(',').join(','),
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editPG) return;
    updateMutation.mutate({ ...form, id: editPG.id });
  };

  const genderBadgeColor = (g: string) => {
    switch (g) {
      case 'MALE': return 'bg-sky-100 text-sky-700';
      case 'FEMALE': return 'bg-pink-100 text-pink-700';
      default: return 'bg-purple-100 text-purple-700';
    }
  };

  const getOccupancy = (pg: PG) => {
    const rooms = pg.rooms || [];
    const totalBeds = rooms.reduce((sum, r) => sum + (r.beds?.length || 0), 0);
    const occupied = rooms.reduce(
      (sum, r) => sum + (r.beds?.filter((b: { status: string }) => b.status === 'OCCUPIED').length || 0), 0
    );
    return { total: totalBeds, occupied, rate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0 };
  };

  const parseAmenities = (formState: typeof form) => {
    const raw = formState.amenities as unknown;
    return Array.isArray(raw) ? raw :
      typeof raw === 'string' ? (raw as string).split(',').filter(Boolean) : [];
  };

  const pgFormContent = (isEdit: boolean, mutation: typeof createMutation | typeof updateMutation) => (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>PG Name *</Label>
        <Input placeholder="e.g., Sunrise PG - Koramangala" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Address *</Label>
        <Textarea placeholder="Full address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>City *</Label>
          <Select value={form.city} onValueChange={v => setForm(p => ({ ...p, city: v }))}>
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>
              {CITIES.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gender Type</Label>
          <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Boys</SelectItem>
              <SelectItem value="FEMALE">Girls</SelectItem>
              <SelectItem value="UNISEX">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monthly Rent (&#8377;) *</Label>
          <Input type="number" placeholder="12000" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Security Deposit (&#8377;)</Label>
          <Input type="number" placeholder="24000" value={form.securityDeposit} onChange={e => setForm(p => ({ ...p, securityDeposit: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="Describe your PG..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Amenities</Label>
        <div className="grid grid-cols-3 gap-2">
          {AMENITIES_LIST.map(amenity => (
            <label key={amenity.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded-lg hover:bg-muted">
              <Checkbox
                checked={parseAmenities(form).includes(amenity.id)}
                onCheckedChange={() => toggleAmenity(amenity.id)}
              />
              <span className="text-foreground">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>
      <Button
        className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white"
        onClick={() => isEdit ? handleEditSave() : createMutation.mutate(form)}
        disabled={mutation.isPending || !form.name || !form.address}
      >
        {mutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
        {isEdit ? 'Save Changes' : 'Create PG Property'}
      </Button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My PG Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your PG accommodations</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white shadow-md">
              <Plus className="size-4 mr-2" /> Add New PG
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New PG Property</DialogTitle>
            </DialogHeader>
            {pgFormContent(false, createMutation)}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, address, city..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* PG count badge */}
      <Badge variant="outline" className="text-brand-teal border-brand-teal/20 bg-brand-teal/10 px-3 py-1.5 w-fit">
        <Building2 className="size-3.5 mr-1.5" />
        {filteredPGs.length} PG{filteredPGs.length !== 1 ? 's' : ''}
      </Badge>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-40 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPGs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Building2 className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">No PG Properties Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {pgs?.length === 0 ? 'Add your first PG property to get started' : 'Try adjusting your search or filters'}
            </p>
            {pgs?.length === 0 && (
              <Button className="mt-4 bg-gradient-to-r from-brand-deep to-brand-teal text-white" onClick={() => setAddOpen(true)}>
                <Plus className="size-4 mr-2" /> Add Your First PG
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredPGs.map((pg: PG, index: number) => {
              const occupancy = getOccupancy(pg);
              const isExpanded = expandedPG === pg.id;
              return (
                <motion.div
                  key={pg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all duration-200 overflow-hidden">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{pg.name}</h3>
                            <Badge className={genderBadgeColor(pg.gender)}>
                              {pg.gender === 'MALE' ? 'Boys' : pg.gender === 'FEMALE' ? 'Girls' : 'Unisex'}
                            </Badge>
                            <Badge className={STATUSES.PG[pg.status as keyof typeof STATUSES.PG]?.color}>
                              {STATUSES.PG[pg.status as keyof typeof STATUSES.PG]?.label || pg.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="truncate">{pg.address}, {pg.city}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-medium text-foreground">{pg.rating}</span>
                              <span className="text-xs text-muted-foreground">({pg.totalReviews})</span>
                            </div>
                            <div className="text-sm font-semibold text-brand-teal">{formatCurrency(pg.price)}/mo</div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="text-muted-foreground"><BedDouble className="size-3.5 inline mr-1" />{occupancy.total} beds</span>
                            <span className="text-emerald-600 font-medium">{occupancy.rate}% occupied</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-deep to-brand-teal rounded-full transition-all duration-500"
                              style={{ width: `${occupancy.rate}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button variant="outline" size="icon" className="size-8" onClick={() => openEdit(pg)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setSelectedPG(pg);
                              useAppStore.getState().setCurrentView('OWNER_ROOMS');
                            }}
                          >
                            <BedDouble className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 text-destructive hover:bg-destructive/10"
                            onClick={() => { setDeleteTarget(pg); setDeleteOpen(true); }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />
                      <button
                        onClick={() => setExpandedPG(isExpanded ? null : pg.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-teal transition-colors w-full text-left"
                      >
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        <span>{isExpanded ? 'Hide' : 'Show'} Rooms Summary</span>
                        <span className="text-xs text-muted-foreground ml-auto">{pg.rooms?.length || 0} rooms</span>
                      </button>

                      <AnimatePresence>
                        {isExpanded && pg.rooms && pg.rooms.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 space-y-2">
                              {pg.rooms.map((room: { id: string; roomCode: string; roomType: string; floor: number; hasAC: boolean; hasAttachedBath: boolean; beds?: { status: string }[] }) => {
                                const totalBeds = room.beds?.length || 0;
                                const occupiedBeds = room.beds?.filter(b => b.status === 'OCCUPIED').length || 0;
                                return (
                                  <div key={room.id} className="flex items-center justify-between p-2.5 bg-muted rounded-lg text-sm">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="font-mono text-xs">{room.roomCode}</Badge>
                                      <span className="text-muted-foreground">{room.roomType}</span>
                                      <span className="text-muted-foreground">F{room.floor}</span>
                                      {room.hasAC && <span className="text-brand-teal text-xs">AC</span>}
                                      {room.hasAttachedBath && <span className="text-emerald-600 text-xs">Bath</span>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">{occupiedBeds}/{totalBeds}</span>
                                      <BedDouble className="size-3 text-muted-foreground" />
                                    </div>
                                  </div>
                                );
                              })}
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) setEditPG(null); setEditOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit PG Property</DialogTitle>
          </DialogHeader>
          {pgFormContent(true, updateMutation)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PG Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone. All rooms, beds, and associated data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
