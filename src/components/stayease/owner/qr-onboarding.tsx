'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { QrCode, Building2, Download, Share2, Copy, Check, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/use-app-store';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api-client';
import type { AppView } from '@/lib/types';

export default function QROnboarding() {
  const { setCurrentView } = useAppStore();
  const [selectedPG, setSelectedPG] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: ownerUser } = useQuery({
    queryKey: ['owner-user'],
    queryFn: async () => {
      const res = await authFetch('/api/auth?role=OWNER');
      if (!res.ok) throw new Error('Failed');
      const users = await res.json();
      return (Array.isArray(users) ? users : users.users)?.[0] || null;
    },
  });
  const ownerId = ownerUser?.id;

  const { data: pgs } = useQuery({
    queryKey: ['owner-pgs-qr', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/pgs?ownerId=${ownerId}`);
      return res.json();
    },
    enabled: !!ownerId,
  });

  const pgList = pgs || [];
  const currentPG = pgList.find((p: { id: string }) => p.id === selectedPG);

  const qrUrl = typeof window !== 'undefined' && currentPG
    ? `${window.location.origin}?pg=${currentPG.id}&ref=qr`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('OWNER_DASHBOARD')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR Code Onboarding</h1>
          <p className="text-muted-foreground mt-1">Generate QR codes for your PGs</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select PG Property</label>
            <Select value={selectedPG} onValueChange={setSelectedPG}>
              <SelectTrigger><SelectValue placeholder="Choose a PG..." /></SelectTrigger>
              <SelectContent>
                {pgList.map((pg: { id: string; name: string }) => (
                  <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {currentPG && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-sm mx-auto">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{currentPG.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Scan QR to connect tenants</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-6">
              <div className="bg-white p-4 rounded-2xl shadow-lg border">
                <QRCodeSVG value={qrUrl} size={200} level="H" includeMargin={false} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">How it works:</p>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Show this QR to new tenants</li>
                  <li>2. They scan with their phone camera</li>
                  <li>3. Opens StayEg with your PG pre-selected</li>
                  <li>4. They can book or get more info</li>
                </ol>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={copyLink}>
                  {copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  const svg = document.querySelector('svg[role="img"]');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${currentPG.name.replace(/\s+/g, '-')}-QR.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('QR downloaded!');
                  }
                }}>
                  <Download className="size-4 mr-2" /> Download
                </Button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out ${currentPG.name} on StayEg! ${qrUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg text-center transition-colors"
              >
                <Share2 className="size-4 mr-2 inline" />Share on WhatsApp
              </a>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!selectedPG && pgList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Building2 className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">No PG Properties</h3>
            <p className="text-sm text-muted-foreground mt-1">Add a PG first to generate QR codes</p>
            <Button className="mt-4 bg-gradient-to-r from-brand-deep to-brand-teal text-white" onClick={() => setCurrentView('OWNER_PGS')}>
              Add Your First PG
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
