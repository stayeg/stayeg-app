'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, Check, X, AlertTriangle, Building2, Users, BarChart3, Search,
  Eye, Loader2, Star, MapPin, BadgeCheck, UserCheck,
} from 'lucide-react';
import OwnerApproval from './owner-approval';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { STATUSES, CARD_BG, BADGE, TEXT_COLOR } from '@/lib/constants';

export default function AdminDashboard() {
  const { showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'overview' | 'owner-approval'>('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailPG, setDetailPG] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: allPGs, isLoading } = useQuery({
    queryKey: ['admin-pgs'],
    queryFn: async () => {
      const res = await authFetch('/api/pgs');
      if (!res.ok) throw new Error('Failed to fetch PGs');
      return res.json();
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await authFetch('/api/auth');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const updatePGMutation = useMutation({
    mutationFn: async ({ id, status, isVerified }: { id: string; status: string; isVerified: boolean }) => {
      const res = await authFetch('/api/pgs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, isVerified }),
      });
      if (!res.ok) throw new Error('Failed to update PG');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pgs'] });
      showToast('PG status updated!');
      setDetailOpen(false);
    },
    onError: () => showToast('Failed to update PG status'),
  });

  const pgs = allPGs || [];
  const users = allUsers || [];

  const filteredPGs = pgs.filter((pg: { status: string; name: string; address: string }) => {
    if (filterStatus !== 'all' && pg.status !== filterStatus) return false;
    if (searchQuery && !pg.name.toLowerCase().includes(searchQuery.toLowerCase()) && !pg.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingCount = pgs.filter((pg: { status: string }) => pg.status === 'PENDING').length;
  const approvedCount = pgs.filter((pg: { status: string }) => pg.status === 'APPROVED').length;
  const rejectedCount = pgs.filter((pg: { status: string }) => pg.status === 'REJECTED').length;
  const totalUsers = users.length;
  const ownerCount = users.filter((u: { role: string }) => u.role === 'OWNER').length;
  const tenantCount = users.filter((u: { role: string }) => u.role === 'TENANT').length;

  const handleVerify = (pg: any, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    updatePGMutation.mutate({ id: pg.id, status, isVerified: action === 'approve' });
  };

  const openDetail = (pg: any) => {
    setDetailPG(pg);
    setDetailOpen(true);
  };

  const statusColor = (status: string) => STATUSES.PG[status as keyof typeof STATUSES.PG]?.color || 'bg-muted text-muted-foreground';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="size-6 text-brand-teal" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Monitor and manage the StayEg platform</p>
      </div>

      {/* Section Tabs */}
      <div className="flex bg-muted rounded-xl p-1">
        {([
          { key: 'overview' as const, label: 'PG Verification', icon: BadgeCheck },
          { key: 'owner-approval' as const, label: 'Owner Approvals', icon: UserCheck },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeSection === tab.key
                ? 'bg-card text-brand-teal shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Owner Approval Section */}
      {activeSection === 'owner-approval' && <OwnerApproval />}

      {/* PG Verification Section */}
      {activeSection === 'overview' && (
        <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total PGs', value: pgs.length, icon: Building2, color: 'bg-brand-teal/10 text-brand-teal', iconColor: 'bg-brand-teal/15' },
          { label: 'Pending Review', value: pendingCount, icon: AlertTriangle, color: `${CARD_BG.yellow} ${TEXT_COLOR.yellow}`, iconColor: BADGE.yellow },
          { label: 'Total Users', value: totalUsers, icon: Users, color: `${CARD_BG.green} ${TEXT_COLOR.green}`, iconColor: BADGE.green },
          { label: 'PG Owners', value: ownerCount, icon: Shield, color: `${CARD_BG.purple} ${TEXT_COLOR.purple}`, iconColor: BADGE.purple },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                  </div>
                  <div className={`${stat.iconColor} p-2.5 rounded-xl`}>
                    <stat.icon className={`size-5 ${stat.color.split(' ')[1]}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Users Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" /> User Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-brand-teal/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{ownerCount}</p>
              <p className="text-sm text-brand-teal">PG Owners</p>
            </div>
            <div className={`${CARD_BG.green} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-foreground">{tenantCount}</p>
              <p className={`text-sm ${TEXT_COLOR.greenLight}`}>Tenants</p>
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{users.filter((u: { role: string }) => u.role === 'ADMIN').length}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search PGs by name or address..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PG Verification Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-brand-teal" /> PG Verification
            </span>
            <Badge variant="outline" className="text-xs">{filteredPGs.length} PGs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
          ) : filteredPGs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="size-10 mx-auto mb-2 opacity-50" />
              <p>No PGs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PG Name</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPGs.map((pg: { id: string; name: string; address: string; city: string; gender: string; price: number; status: string; rating: number; isVerified: boolean; owner?: { name: string } }, idx: number) => (
                    <TableRow key={pg.id} className="hover:bg-muted">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm">{pg.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{pg.address}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3" />
                          <span className="truncate max-w-48">{pg.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {pg.gender === 'MALE' ? 'Boys' : pg.gender === 'FEMALE' ? 'Girls' : 'Unisex'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">₹{pg.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColor(pg.status)} text-xs`}>
                          {STATUSES.PG[pg.status as keyof typeof STATUSES.PG]?.label || pg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDetail(pg)}>
                            <Eye className="size-3" />
                          </Button>
                          {pg.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleVerify(pg, 'approve')}
                                disabled={updatePGMutation.isPending}
                              >
                                <Check className="size-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => handleVerify(pg, 'reject')}
                                disabled={updatePGMutation.isPending}
                              >
                                <X className="size-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      </>

      )}
      {/* End PG Verification Section */}

      {/* PG Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              PG Details
              {detailPG?.isVerified && <BadgeCheck className="size-5 text-green-500" />}
            </DialogTitle>
          </DialogHeader>
          {detailPG && (
            <div className="space-y-4 pt-2">
              {(() => {
                const imgs = Array.isArray(detailPG.images) ? detailPG.images :
                  typeof detailPG.images === 'string' ? detailPG.images.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                return imgs.length > 0 && (
                <div className="rounded-xl overflow-hidden">
                  <img src={imgs[0]} alt={detailPG.name} className="w-full h-48 object-cover" />
                </div>
              );
              })()}
              <div>
                <h3 className="text-xl font-bold text-foreground">{detailPG.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="size-3.5" /> {detailPG.address}, {detailPG.city}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="size-4 fill-brand-sage text-brand-sage" />
                    <span className="font-semibold">{detailPG.rating}</span>
                    <span className="text-xs text-muted-foreground">({detailPG.totalReviews} reviews)</span>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-semibold mt-1">₹{detailPG.price.toLocaleString('en-IN')}/mo</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-semibold mt-1">{detailPG.gender === 'MALE' ? 'Boys' : detailPG.gender === 'FEMALE' ? 'Girls' : 'Unisex'}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={`${statusColor(detailPG.status)} text-xs mt-1`}>
                    {STATUSES.PG[detailPG.status as keyof typeof STATUSES.PG]?.label || detailPG.status}
                  </Badge>
                </div>
              </div>
              {detailPG.description && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{detailPG.description}</p>
                </div>
              )}
              {detailPG.amenities?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPG.amenities.map((a: string) => (
                      <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Owner</p>
                <p className="text-sm text-muted-foreground">{detailPG.owner?.name || 'N/A'}</p>
              </div>
              {detailPG.rooms && detailPG.rooms.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Rooms</p>
                  <p className="text-sm text-muted-foreground">{detailPG.rooms.length} rooms, {detailPG.rooms.reduce((s: number, r: any) => s + (r.beds?.length || 0), 0)} total beds</p>
                </div>
              )}
              {detailPG.status === 'PENDING' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleVerify(detailPG, 'approve')}
                    disabled={updatePGMutation.isPending}
                  >
                    {updatePGMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                    Approve PG
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleVerify(detailPG, 'reject')}
                    disabled={updatePGMutation.isPending}
                  >
                    <X className="size-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
