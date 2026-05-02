'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  IndianRupee, Check, Loader2, Filter, CalendarDays, CreditCard,
  Download, Phone, AlertTriangle, TrendingUp, Banknote, Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { STATUSES, BADGE, TEXT_COLOR, CARD_BG } from '@/lib/constants';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function RentManagement() {
  const { showToast, currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [filterPG, setFilterPG] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{
    id: string; amount: number; month: string; tenantName: string; tenantPhone?: string; method: string;
  } | null>(null);
  const [receiptData, setReceiptData] = useState<{
    tenantName: string; month: string; amount: number; paidDate: string; method: string; pgName: string;
  } | null>(null);

  const ownerId = currentUser?.id;

  const { data: tenants } = useQuery({
    queryKey: ['owner-tenants-rent', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/tenants?ownerId=${ownerId}`);
      return res.json();
    },
    enabled: !!ownerId,
  });

  const { data: rentRecords, isLoading } = useQuery({
    queryKey: ['owner-rent-records', ownerId, filterMonth],
    queryFn: async () => {
      const params = new URLSearchParams({ ownerId: ownerId!, month: filterMonth });
      const res = await authFetch(`/api/rent-records?${params}`);
      return res.json();
    },
    enabled: !!ownerId,
  });
  const records = rentRecords || [];

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const res = await authFetch('/api/rent-records', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'PAID', method }) });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-rent-records'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics'] });
      showToast('Payment marked as paid!');
      setPayDialogOpen(false);
      setSelectedRecord(null);
    },
    onError: () => showToast('Failed to update payment'),
  });

  const filteredRecords = useMemo(() => {
    let result = records;
    if (filterPG !== 'all') result = result.filter((r: { tenant?: { pgId: string } }) => r.tenant?.pgId === filterPG);
    if (filterStatus !== 'all') result = result.filter((r: { status: string }) => r.status === filterStatus);
    return result;
  }, [records, filterPG, filterStatus]);

  const completedRecords = records.filter((r: { status: string }) => r.status === 'PAID');
  const pendingRecords = records.filter((r: { status: string }) => r.status === 'PENDING');
  const overdueRecords = records.filter((r: { status: string }) => r.status === 'OVERDUE');
  const totalCollected = completedRecords.reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);
  const totalPending = pendingRecords.reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);
  const totalOverdue = overdueRecords.reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);
  const collectionRate = records.length > 0 ? Math.round((completedRecords.length / records.length) * 100) : 0;

  const pgNameMap: Record<string, string> = {};
  (tenants || []).forEach((t: { pgId: string; pg?: { name: string } }) => { if (t.pg?.name) pgNameMap[t.pgId] = t.pg.name; });

  const statusColor = (status: string) => {
    switch (status) { case 'PAID': return BADGE.green; case 'PENDING': return BADGE.yellow; case 'OVERDUE': return BADGE.red; case 'PARTIAL': return 'bg-teal-100 text-teal-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const exportCSV = () => {
    const headers = ['Tenant', 'PG', 'Room', 'Month', 'Amount', 'Status', 'Paid Date', 'Method'];
    const rows = filteredRecords.map((r: { tenant?: { name: string; pg?: { name: string }; room?: { roomCode: string } }; month: string; amount: number; status: string; paidDate?: string; method?: string }) => [
      r.tenant?.name || '', r.tenant?.pg?.name || '', r.tenant?.room?.roomCode || '',
      r.month, r.amount, r.status, r.paidDate ? formatDate(r.paidDate) : '', r.method || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-records-${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
  };

  const sendWhatsAppReminder = (tenantName: string, phone: string, amount: number) => {
    const msg = encodeURIComponent(`Hi ${tenantName}, your rent of ${formatCurrency(amount)} for this month is due. Please pay at the earliest. Thank you! - ${currentUser?.name || 'StayEg PG Owner'}`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  const handleMarkPaid = (record: { id: string; amount: number; month: string; tenant?: { name: string; phone?: string }; method: string }) => {
    setSelectedRecord({ id: record.id, amount: record.amount, month: record.month, tenantName: record.tenant?.name || 'Tenant', tenantPhone: record.tenant?.phone, method: record.method || 'CASH' });
    setPayDialogOpen(true);
  };

  const handleViewReceipt = (record: { tenant?: { name: string; pg?: { name: string } }; month: string; amount: number; paidDate?: string; method?: string }) => {
    setReceiptData({
      tenantName: record.tenant?.name || 'Tenant', month: record.month, amount: record.amount,
      paidDate: record.paidDate ? formatDate(record.paidDate) : formatDate(new Date().toISOString()),
      method: record.method || 'Cash', pgName: record.tenant?.pg?.name || 'PG',
    });
    setReceiptOpen(true);
  };

  const monthLabel = new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rent Management</h1>
          <p className="text-muted-foreground mt-1">Track and collect rent payments</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filteredRecords.length === 0}>
          <Download className="size-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Collected This Month', amount: formatCurrency(totalCollected), icon: Banknote, bg: CARD_BG.green, text: TEXT_COLOR.green, sub: `${completedRecords.length} payments` },
          { label: 'Pending', amount: formatCurrency(totalPending), icon: CalendarDays, bg: CARD_BG.yellow, text: TEXT_COLOR.yellow, sub: `${pendingRecords.length} tenants` },
          { label: 'Overdue', amount: formatCurrency(totalOverdue), icon: AlertTriangle, bg: CARD_BG.red, text: TEXT_COLOR.red, sub: `${overdueRecords.length} tenants` },
          { label: 'Collection Rate', amount: `${collectionRate}%`, icon: TrendingUp, bg: 'bg-violet-50', text: 'text-violet-700', sub: `of ${records.length} total` },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${card.bg} p-2.5 rounded-xl shrink-0`}>
                    <card.icon className={`size-5 ${card.text}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className={`text-lg font-bold ${card.text} truncate`}>{card.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Filter className="size-4 text-muted-foreground mt-2 sm:mt-0" />
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full sm:w-44" />
            <Select value={filterPG} onValueChange={setFilterPG}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All PGs" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All PGs</SelectItem>{Object.entries(pgNameMap).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="PAID">Paid</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="OVERDUE">Overdue</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="size-4 text-brand-teal" />
            Rent Records for {monthLabel} ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="size-10 mx-auto mb-2 opacity-50" />
              <p>No rent records for {monthLabel}</p>
              <p className="text-xs mt-1">Records are auto-created when tenants are added</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredRecords.map((r: { id: string; tenant?: { name: string; phone?: string; pg?: { name: string }; room?: { roomCode: string }; bed?: { bedNumber: number } }; month: string; amount: number; status: string; paidDate?: string; method?: string }, idx: number) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{r.tenant?.name || 'Unknown'}</span>
                      <Badge className={`${statusColor(r.status)} text-[10px]`}>{r.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{r.tenant?.pg?.name}</span>
                      {r.tenant?.room && <span>{r.tenant.room.roomCode} - #{r.tenant.bed?.bedNumber}</span>}
                      <span>{r.method || '-'}</span>
                      {r.paidDate && <span>{formatDate(r.paidDate)}</span>}
                    </div>
                  </div>
                  <span className="font-semibold text-sm shrink-0">{formatCurrency(r.amount)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.status !== 'PAID' && r.tenant?.phone && (
                      <button onClick={() => sendWhatsAppReminder(r.tenant?.name ?? '', r.tenant?.phone ?? '', r.amount)} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors" title="WhatsApp Reminder"><Phone className="size-3" /></button>
                    )}
                    {r.status !== 'PAID' && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2" onClick={() => handleMarkPaid({ ...r, method: r.method || 'UPI' })}>
                        <Check className="size-3 mr-1" /> Pay
                      </Button>
                    )}
                    {r.status === 'PAID' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleViewReceipt(r)}>
                        <Receipt className="size-3 mr-1" /> Receipt
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">{selectedRecord.tenantName} &bull; {selectedRecord.month}</p>
                <p className={`text-3xl font-bold ${TEXT_COLOR.green} mt-1`}>{formatCurrency(selectedRecord.amount)}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={selectedRecord.method} onValueChange={(v) => setSelectedRecord({ ...selectedRecord, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="CARD">Card</SelectItem><SelectItem value="NET_BANKING">Net Banking</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {selectedRecord.tenantPhone && (
                  <Button variant="outline" className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => sendWhatsAppReminder(selectedRecord.tenantName, selectedRecord.tenantPhone!, selectedRecord.amount)}>
                    <Phone className="size-4 mr-2" /> WhatsApp
                  </Button>
                )}
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markPaidMutation.mutate({ id: selectedRecord.id, method: selectedRecord.method })} disabled={markPaidMutation.isPending}>
                {markPaidMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}Confirm Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
          {receiptData && (
            <div className="border-2 border-dashed border-border rounded-xl p-5 space-y-3">
              <div className="text-center">
                <p className="font-bold text-lg text-brand-teal">StayEg PG</p>
                <p className="text-xs text-muted-foreground">Payment Receipt</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Tenant</span><span className="font-medium">{receiptData.tenantName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PG</span><span className="font-medium">{receiptData.pgName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Month</span><span className="font-medium">{receiptData.month}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{receiptData.paidDate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{receiptData.method}</span></div>
              </div>
              <div className="border-t pt-3 text-center">
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(receiptData.amount)}</p>
              </div>
              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                <p>Generated by StayEg PG Management</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
