'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, CheckCircle2, AlertTriangle, Copy, Check, ExternalLink,
  RefreshCw, Shield, Server, Zap, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SetupResponse {
  status: 'setup_required' | 'ready' | 'error';
  message: string;
  sql?: string;
  tablesFound?: boolean;
  stats?: { users: number; pgs: number; beds: number };
  error?: string;
}

export default function DatabaseSetup({ onReady }: { onReady: () => void }) {
  const [setupStatus, setSetupStatus] = useState<SetupResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // 0 = loading, 1 = step1_copy, 2 = step2_paste, 3 = step3_verify

  const checkDatabase = async () => {
    try {
      setChecking(true);
      const res = await fetch('/api/setup');
      const data: SetupResponse = await res.json();
      setSetupStatus(data);

      if (data.status === 'ready') {
        onReady();
      } else {
        setCurrentStep(1);
      }
    } catch {
      setSetupStatus({ status: 'error', message: 'Could not reach Supabase' });
      setCurrentStep(1);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  const handleCopy = async () => {
    if (!setupStatus?.sql) return;
    try {
      await navigator.clipboard.writeText(setupStatus.sql);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = setupStatus.sql;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    setCurrentStep(2);
  };

  const handleOpenSupabase = () => {
    window.open(
      'https://supabase.com/dashboard/project/sbwmecxkbfijanwwuvvt/sql/new',
      '_blank'
    );
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/setup');
      const data: SetupResponse = await res.json();
      setSetupStatus(data);
      if (data.status === 'ready') {
        setCurrentStep(3);
        setTimeout(() => onReady(), 1500);
      } else {
        setCurrentStep(2);
        // Keep showing step 2 with a message
      }
    } catch { /* keep current step */ }
    setVerifying(false);
  };

  // Loading
  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <div className="relative mx-auto w-14 h-14">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary" />
            <Database className="absolute inset-0 m-auto w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Checking database...</p>
        </motion.div>
      </div>
    );
  }

  // Success!
  if (currentStep === 3 || (setupStatus?.status === 'ready' && currentStep === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </motion.div>
          <div>
            <p className="text-2xl font-bold text-foreground">Database Ready!</p>
            <p className="text-sm text-muted-foreground mt-1">Loading StayEg...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full space-y-5">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-brand-deep to-brand-teal rounded-2xl flex items-center justify-center shadow-lg">
            <Database className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Quick Database Setup</h1>
          <p className="text-sm text-muted-foreground">
            Just 3 steps to get your StayEg app running!
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0">
          {[
            { num: 1, label: 'Copy SQL' },
            { num: 2, label: 'Paste & Run' },
            { num: 3, label: 'Verify' },
          ].map((s, i) => {
            const isActive = currentStep >= s.num;
            const isNow = currentStep === s.num;
            return (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isActive && !isNow ? 'bg-green-500 text-white' : isNow ? 'bg-brand-deep text-white ring-4 ring-brand-deep/20' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isActive && !isNow ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-[10px] mt-1 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className={`w-12 h-0.5 mb-5 transition-colors duration-300 ${currentStep > s.num ? 'bg-green-500' : 'bg-muted'}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Copy SQL */}
        <motion.div animate={currentStep === 1 ? { scale: [1, 1.02, 1] } : {}} transition={{ duration: 2, repeat: Infinity }}>
          <Card className={`overflow-hidden transition-all duration-300 ${currentStep === 1 ? 'ring-2 ring-brand-deep shadow-lg' : currentStep < 1 ? 'opacity-40' : ''}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep > 1 ? 'bg-green-500 text-white' : 'bg-brand-deep text-white'}`}>
                  {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Copy the SQL Setup Script</p>
                  <p className="text-xs text-muted-foreground">Click the button below</p>
                </div>
              </div>
              <Button
                onClick={handleCopy}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-brand-deep to-brand-deep/80 hover:from-brand-deep/90 hover:to-brand-deep/70 text-white"
                size="lg"
              >
                {copied ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2 text-green-300" /> Copied to Clipboard!</>
                ) : (
                  <><Copy className="w-5 h-5 mr-2" /> Click Here to Copy SQL</>
                )}
              </Button>
              {copied && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Great! Now go to the next step below.
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 2: Paste & Run */}
        <Card className={`overflow-hidden transition-all duration-300 ${currentStep === 2 ? 'ring-2 ring-brand-deep shadow-lg' : currentStep < 2 ? 'opacity-40' : ''}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep > 2 ? 'bg-green-500 text-white' : 'bg-brand-deep text-white'}`}>
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Open Supabase & Paste</p>
                <p className="text-xs text-muted-foreground">Open SQL Editor, paste the SQL, click Run</p>
              </div>
            </div>

            <Button
              onClick={handleOpenSupabase}
              variant="outline"
              className="w-full h-12 text-base font-semibold border-brand-teal/50 text-brand-teal hover:bg-brand-teal/10"
              size="lg"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Open Supabase SQL Editor
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> In the SQL Editor:
              </p>
              <ol className="text-xs text-amber-700 ml-3 list-decimal space-y-0.5">
                <li>Click anywhere in the text area</li>
                <li>Press <kbd className="px-1 py-0.5 bg-amber-100 rounded text-[10px] font-mono">Ctrl+V</kbd> (or <kbd className="px-1 py-0.5 bg-amber-100 rounded text-[10px] font-mono">Cmd+V</kbd> on Mac)</li>
                <li>Click the green <strong>&quot;Run&quot;</strong> button at the bottom</li>
                <li>Wait for &quot;Success&quot; message</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Verify */}
        <Card className={`overflow-hidden transition-all duration-300 ${currentStep >= 2 ? '' : 'opacity-40'}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep > 3 ? 'bg-green-500 text-white' : 'bg-brand-deep text-white'}`}>
                {currentStep > 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Verify Setup</p>
                <p className="text-xs text-muted-foreground">Come back here and click verify</p>
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={verifying || currentStep < 2}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white disabled:opacity-50"
              size="lg"
            >
              {verifying ? (
                <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Checking...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Verify Database is Ready</>
              )}
            </Button>

            {setupStatus?.status === 'setup_required' && currentStep === 2 && !verifying && (
              <p className="text-xs text-center text-amber-600">
                Tables not found yet. Make sure you clicked &quot;Run&quot; in the SQL Editor.
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* What gets created */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Server className="w-3 h-3" /> This creates 9 tables with sample data:
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { n: 'Users', e: '👥', c: '10' },
              { n: 'PGs', e: '🏠', c: '8' },
              { n: 'Rooms', e: '🚪', c: '26' },
              { n: 'Beds', e: '🛏️', c: '67' },
              { n: 'Bookings', e: '📋', c: '6' },
            ].map((i) => (
              <div key={i.n} className="bg-muted/50 rounded-md p-1.5 text-center">
                <span className="text-sm">{i.e}</span>
                <div className="text-[10px] text-muted-foreground">{i.n}</div>
                <div className="text-[9px] font-medium text-primary">{i.c}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase link */}
        <div className="text-center">
          <a
            href="https://supabase.com/dashboard/project/sbwmecxkbfijanwwuvvt/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            supabase.com/dashboard/project/.../sql/new
          </a>
        </div>
      </motion.div>
    </div>
  );
}
