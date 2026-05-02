'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, BedDouble, Snowflake, Bath, ChevronDown, ChevronUp, Loader2, Check,
  CheckCircle2, RefreshCw, Bed, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { BADGE_BORDER } from '@/lib/constants';
import { toast } from 'sonner';

export default function RoomManagement() {
  const { selectedPG, currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [localPgId, setLocalPgId] = useState('');
  const selectedPgId = selectedPG?.id || localPgId;
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addBedOpen, setAddBedOpen] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [selectedRoomForBeds, setSelectedRoomForBeds] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    roomCode: '', roomType: 'DOUBLE', floor: '1', hasAC: false, hasAttachedBath: false, bedCount: '2',
  });
  const [bedCountForm, setBedCountForm] = useState('1');
  const [bedPriceForm, setBedPriceForm] = useState('');

  const ownerId = currentUser?.id;

  const { data: pgs } = useQuery({
    queryKey: ['owner-pgs-list', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      return res.json();
    },
    enabled: !!ownerId,
  });

  const pgList = pgs || [];

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['owner-rooms', selectedPgId],
    queryFn: async () => {
      const res = await authFetch(`/api/rooms?pgId=${selectedPgId}`);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    enabled: !!selectedPgId,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: typeof roomForm) => {
      const res = await authFetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pgId: selectedPgId,
          roomCode: data.roomCode,
          roomType: data.roomType,
          floor: Number(data.floor) || 1,
          hasAC: data.hasAC,
          hasAttachedBath: data.hasAttachedBath,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Room creation failed'); }
      const room = await res.json();

      // Create beds for the room
      const bedCount = Number(data.bedCount) || 2;
      for (let i = 1; i <= bedCount; i++) {
        await authFetch('/api/beds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room.id, bedNumber: i, status: 'AVAILABLE' }),
        });
      }
      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pgs'] });
      toast.success('Room added successfully!');
      setAddRoomOpen(false);
      setRoomForm({ roomCode: '', roomType: 'DOUBLE', floor: '1', hasAC: false, hasAttachedBath: false, bedCount: '2' });
    },
    onError: (e) => toast.error(e.message || 'Failed to add room'),
  });

  const addBedsMutation = useMutation({
    mutationFn: async ({ roomId, count, price }: { roomId: string; count: number; price?: number }) => {
      // Get current beds for this room to determine next bed number
      const roomData = rooms?.find((r: { id: string }) => r.id === roomId);
      const existingBeds = roomData?.beds || [];
      const startNumber = existingBeds.length + 1;

      for (let i = 0; i < count; i++) {
        const res = await authFetch('/api/beds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, bedNumber: startNumber + i, status: 'AVAILABLE', price: price || undefined }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add bed'); }
      }
      return { added: count };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-rooms'] });
      toast.success('Beds added successfully!');
      setAddBedOpen(false);
      setBedCountForm('1');
      setBedPriceForm('');
      setSelectedRoomForBeds(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to add beds'),
  });

  const toggleBedMutation = useMutation({
    mutationFn: async ({ bedId, newStatus }: { bedId: string; newStatus: string }) => {
      const res = await authFetch('/api/beds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bedId, status: newStatus }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update bed'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-rooms'] });
    },
    onError: (e) => toast.error(e.message || 'Failed to update bed'),
  });

  const cycleBedStatus = (bedId: string, currentStatus: string) => {
    const statuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const statusLabel = statuses[nextIndex];
    toggleBedMutation.mutate({ bedId, newStatus: statusLabel });
    toast.success(`Bed set to ${statusLabel.charAt(0) + statusLabel.slice(1).toLowerCase()}`);
  };

  const bedStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return BADGE_BORDER.green;
      case 'OCCUPIED': return BADGE_BORDER.red;
      case 'MAINTENANCE': return BADGE_BORDER.yellow;
      default: return 'bg-muted text-foreground';
    }
  };

  const bedDotColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500';
      case 'OCCUPIED': return 'bg-red-500';
      case 'MAINTENANCE': return 'bg-amber-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getRoomTypeBadge = (type: string) => {
    const colors: Record<string, string> = { SINGLE: 'bg-teal-100 text-teal-700', DOUBLE: 'bg-sky-100 text-sky-700', TRIPLE: 'bg-violet-100 text-violet-700', DORMITORY: 'bg-muted text-foreground', SHARED: 'bg-muted text-foreground' };
    return colors[type] || 'bg-muted text-foreground';
  };

  const totalBeds = (rooms || []).reduce((sum: number, r: { beds?: unknown[] }) => sum + (r.beds?.length || 0), 0);
  const totalOccupied = (rooms || []).reduce((sum: number, r: { beds?: { status: string }[] }) => sum + (r.beds?.filter(b => b.status === 'OCCUPIED').length || 0), 0);
  const totalAvailable = (rooms || []).reduce((sum: number, r: { beds?: { status: string }[] }) => sum + (r.beds?.filter(b => b.status === 'AVAILABLE').length || 0), 0);
  const totalMaintenance = (rooms || []).reduce((sum: number, r: { beds?: { status: string }[] }) => sum + (r.beds?.filter(b => b.status === 'MAINTENANCE').length || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room & Bed Management</h1>
          <p className="text-muted-foreground mt-1">Manage rooms and bed allocations</p>
        </div>
      </div>

      {/* PG Selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 max-w-md">
          <Select value={selectedPgId || ''} onValueChange={setLocalPgId}>
            <SelectTrigger><SelectValue placeholder="Select a PG property..." /></SelectTrigger>
            <SelectContent>
              {pgList.map((pg: { id: string; name: string }) => (
                <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedPgId} className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white">
              <Plus className="size-4 mr-2" /> Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Room</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Room Code *</Label><Input placeholder="e.g., A101" value={roomForm.roomCode} onChange={e => setRoomForm(p => ({ ...p, roomCode: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Room Type</Label>
                  <Select value={roomForm.roomType} onValueChange={v => setRoomForm(p => ({ ...p, roomType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="SINGLE">Single</SelectItem><SelectItem value="DOUBLE">Double</SelectItem><SelectItem value="TRIPLE">Triple</SelectItem><SelectItem value="DORMITORY">Dormitory</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Floor</Label><Input type="number" min="0" value={roomForm.floor} onChange={e => setRoomForm(p => ({ ...p, floor: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Initial Bed Count</Label><Input type="number" min="1" max="8" value={roomForm.bedCount} onChange={e => setRoomForm(p => ({ ...p, bedCount: e.target.value }))} /></div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><Label>Air Conditioning</Label><Switch checked={roomForm.hasAC} onCheckedChange={v => setRoomForm(p => ({ ...p, hasAC: v }))} /></div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><Label>Attached Bathroom</Label><Switch checked={roomForm.hasAttachedBath} onCheckedChange={v => setRoomForm(p => ({ ...p, hasAttachedBath: v }))} /></div>
              <Button className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white" onClick={() => createRoomMutation.mutate(roomForm)} disabled={createRoomMutation.isPending || !roomForm.roomCode}>
                {createRoomMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}Create Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedPgId ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center"><BedDouble className="size-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold text-muted-foreground">Select a PG Property</h3><p className="text-sm text-muted-foreground mt-1">Choose a PG from the dropdown above to manage rooms</p></CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        </div>
      ) : (rooms || []).length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center"><BedDouble className="size-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold text-muted-foreground">No Rooms Yet</h3><p className="text-sm text-muted-foreground mt-1">Add your first room to this PG property</p></CardContent></Card>
      ) : (
        <>
          {/* Bed Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="bg-teal-100 p-2 rounded-xl"><BedDouble className="size-4 text-teal-700" /></div><div><p className="text-xs text-muted-foreground">Total Beds</p><p className="text-lg font-bold text-foreground">{totalBeds}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="bg-emerald-100 p-2 rounded-xl"><CheckCircle2 className="size-4 text-emerald-700" /></div><div><p className="text-xs text-muted-foreground">Available</p><p className="text-lg font-bold text-emerald-700">{totalAvailable}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-xl"><BedDouble className="size-4 text-red-700" /></div><div><p className="text-xs text-muted-foreground">Occupied</p><p className="text-lg font-bold text-red-700">{totalOccupied}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="bg-violet-100 p-2 rounded-xl"><RefreshCw className="size-4 text-violet-700" /></div><div><p className="text-xs text-muted-foreground">Maintenance</p><p className="text-lg font-bold text-violet-700">{totalMaintenance}</p></div></div></CardContent></Card>
          </div>

          {/* Occupancy bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Overall Occupancy</span>
                <span className="text-sm font-bold text-brand-teal">{occupancyRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-deep to-brand-teal rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Room Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {(rooms || []).map((room: { id: string; roomCode: string; room_type?: string; roomType?: string; floor: number; has_ac?: boolean; hasAC?: boolean; has_attached_bath?: boolean; hasAttachedBath?: boolean; beds?: { id: string; bedNumber: number; status: string; price?: number }[] }, index: number) => {
                const isExpanded = expandedRoom === room.id;
                const beds = room.beds || [];
                const occupied = beds.filter((b: { status: string }) => b.status === 'OCCUPIED').length;
                const available = beds.filter((b: { status: string }) => b.status === 'AVAILABLE').length;
                const maintenance = beds.filter((b: { status: string }) => b.status === 'MAINTENANCE').length;
                const roomType = room.room_type || room.roomType || '';
                const hasAC = room.has_ac ?? room.hasAC ?? false;
                const hasBath = room.has_attached_bath ?? room.hasAttachedBath ?? false;
                return (
                  <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-lg">{room.roomCode}</span>
                              <Badge className={getRoomTypeBadge(roomType)}>{roomType}</Badge>
                              <Badge variant="outline">Floor {room.floor}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {hasAC && <div className="flex items-center gap-1 text-brand-teal text-sm"><Snowflake className="size-3.5" /> AC</div>}
                              {hasBath && <div className="flex items-center gap-1 text-emerald-600 text-sm"><Bath className="size-3.5" /> Bath</div>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-2xl font-bold text-foreground">{beds.length}</div>
                            <div className="text-xs text-muted-foreground">beds</div>
                          </div>
                        </div>
                        {/* Bed summary */}
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-500" />{available} Available</span>
                          <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-red-500" />{occupied} Occupied</span>
                          {maintenance > 0 && <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-500" />{maintenance} Maint.</span>}
                        </div>
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${beds.length > 0 ? (occupied / beds.length) * 100 : 0}%` }} />
                        </div>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedRoom(isExpanded ? null : room.id)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-teal transition-colors w-full text-left">
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                            <span>{isExpanded ? 'Hide' : 'Show'} Bed Details</span>
                          </button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto text-xs h-7 shrink-0"
                            onClick={() => { setSelectedRoomForBeds(room.id); setAddBedOpen(true); }}
                          >
                            <Plus className="size-3 mr-1" /> Add Beds
                          </Button>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {beds.map((bed: { id: string; bedNumber: number; status: string; price?: number }) => (
                                  <button
                                    key={bed.id}
                                    onClick={() => cycleBedStatus(bed.id, bed.status)}
                                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${bedStatusColor(bed.status)}`}
                                  >
                                    <div className={`size-3 rounded-full ${bedDotColor(bed.status)} mx-auto mb-1.5`} />
                                    <div className="text-xs font-semibold">Bed #{bed.bedNumber}</div>
                                    <div className="text-[10px] mt-0.5 opacity-75">{bed.status}</div>
                                    {bed.price && bed.price > 0 && <div className="text-[10px] opacity-60">₹{bed.price.toLocaleString('en-IN')}</div>}
                                  </button>
                                ))}
                              </div>
                              {occupied > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick Vacate:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {beds.filter((b: { status: string }) => b.status === 'OCCUPIED').map((bed: { id: string; bedNumber: number }) => (
                                      <Button
                                        key={bed.id}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                        onClick={(e) => { e.stopPropagation(); toggleBedMutation.mutate({ bedId: bed.id, newStatus: 'AVAILABLE' }); toast.success(`Bed #${bed.bedNumber} set to Available`); }}
                                      >
                                        <CheckCircle2 className="size-3 mr-1" />
                                        #{bed.bedNumber} Vacate
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2 text-center">Click a bed to cycle: Available &rarr; Occupied &rarr; Maintenance</p>
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
        </>
      )}

      {/* Add Beds Dialog */}
      <Dialog open={addBedOpen} onOpenChange={(v) => { setAddBedOpen(v); if (!v) setSelectedRoomForBeds(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Beds to Room</DialogTitle></DialogHeader>
          {selectedRoomForBeds && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Adding beds to <strong>{(rooms || []).find((r: { id: string }) => r.id === selectedRoomForBeds)?.roomCode}</strong>
              </p>
              <div className="space-y-2">
                <Label>Number of Beds to Add</Label>
                <Input type="number" min="1" max="6" value={bedCountForm} onChange={e => setBedCountForm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Price per Bed (₹, optional)</Label>
                <Input type="number" min="0" placeholder="Leave empty to use PG default" value={bedPriceForm} onChange={e => setBedPriceForm(e.target.value)} />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white"
                onClick={() => addBedsMutation.mutate({ roomId: selectedRoomForBeds, count: Number(bedCountForm) || 1, price: Number(bedPriceForm) || undefined })}
                disabled={addBedsMutation.isPending}
              >
                {addBedsMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                Add Beds
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
