'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Bot, User, Sparkles, Plus, CreditCard, MessageCircle,
  BarChart3, Building2, ChevronRight, Loader2,
} from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/use-app-store';
import type { AppView } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'Add Room', icon: Plus, action: 'add_room' },
  { label: 'Check Rent Status', icon: CreditCard, action: 'rent_status' },
  { label: 'View Complaints', icon: MessageCircle, action: 'view_complaints' },
  { label: 'Dashboard Summary', icon: BarChart3, action: 'summary' },
  { label: 'Manage PGs', icon: Building2, action: 'manage_pgs' },
];

const AI_RESPONSES: Record<string, string> = {
  add_room: "Sure! I'll help you add a new room. 🏠\n\nYou can:\n1. Go to **Room & Bed Management** from the sidebar\n2. Select your PG property\n3. Click **Add Room** and fill in the details\n\nWould you like me to navigate you there?",
  rent_status: "Here's a quick overview of your rent status: 📊\n\n• **Total Collected**: ₹2,45,000 this month\n• **Pending Payments**: 3 tenants\n• **Pending Amount**: ₹36,000\n• **Overdue**: 1 payment\n\nWould you like to see the detailed breakdown?",
  view_complaints: "You currently have complaints to review: ⚠️\n\n🔴 **2 Urgent** - Need immediate attention\n🟠 **1 High Priority** - Should address today\n🟡 **3 Medium** - Can schedule this week\n\nI recommend addressing the urgent WiFi and security issues first.",
  summary: "Here's your dashboard summary for today: 📈\n\n🏨 **PG Properties**: 3 active\n🛏️ **Total Beds**: 52 (68% occupied)\n👥 **Active Tenants**: 35\n💰 **Monthly Revenue**: ₹2,45,000\n⭐ **Avg Rating**: 4.3/5.0\n\nYour occupancy rate improved by 5% this month! Great job!",
  manage_pgs: "Your PG properties overview: 🏢\n\n1. **Sunrise PG - Koramangala** ⭐4.5 (72% occupied)\n2. **Green Valley PG - HSR Layout** ⭐4.2 (65% occupied)\n3. **Cozy Corner PG - BTM Layout** ⭐4.1 (58% occupied)\n\nWould you like to manage a specific property?",
};

export default function AIAssistant() {
  const { isAIChatOpen, setAIChatOpen, setCurrentView, currentRole } = useAppStore();
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! 👋 I'm your StayEg AI assistant. I can help you manage your PG properties efficiently.\n\nTry one of the quick actions below or ask me anything about your PG management!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isAIChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isAIChatOpen]);

  const ACTION_TO_VIEW: Record<string, AppView> = {
    add_room: 'OWNER_ROOMS',
    rent_status: 'OWNER_RENT',
    view_complaints: 'OWNER_COMPLAINTS',
    summary: 'OWNER_DASHBOARD',
    manage_pgs: 'OWNER_PGS',
  };

  const handleQuickAction = (action: string, label: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: label,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: AI_RESPONSES[action] || "I'm processing your request. Let me fetch the information for you...",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 800);

    if (ACTION_TO_VIEW[action]) {
      navigateTo(ACTION_TO_VIEW[action]);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const userQuery = input.trim();
    setIsTyping(true);

    setTimeout(() => {
      getAIResponse(userQuery).then((response) => {
        setIsTyping(false);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
      });
    }, 600);
  };

  const getFallbackResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('room') || q.includes('bed') || q.includes('add')) return AI_RESPONSES.add_room;
    if (q.includes('rent') || q.includes('payment') || q.includes('due')) return AI_RESPONSES.rent_status;
    if (q.includes('complaint') || q.includes('issue') || q.includes('problem')) return AI_RESPONSES.view_complaints;
    if (q.includes('summary') || q.includes('overview') || q.includes('dashboard')) return AI_RESPONSES.summary;
    if (q.includes('pg') || q.includes('property') || q.includes('manage')) return AI_RESPONSES.manage_pgs;
    return "I'd be happy to help you with that! Here are some things I can assist with:\n\n• Managing rooms and beds\n• Checking rent payment status\n• Reviewing complaints\n• Dashboard analytics\n• PG property management\n\nTry asking about any of these topics or use the quick actions below.";
  };

  const getAIResponse = async (question: string): Promise<string> => {
    try {
      const res = await authFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          context: currentRole === 'OWNER' ? 'PG Owner' : 'Tenant',
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return data.reply || "I'm sorry, I couldn't process that. Please try again.";
    } catch {
      return getFallbackResponse(question);
    }
  };

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    setAIChatOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isAIChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setAIChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-brand-deep to-brand-teal text-white size-14 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
          >
            <Bot className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isAIChatOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-card shadow-2xl border-l flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-deep to-brand-teal text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">StayEg AI</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="size-1.5 bg-green-400 rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAIChatOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Typing Indicator */}
            {isTyping && (
              <div className="px-4 pt-3 shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-brand-teal" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`shrink-0 size-8 rounded-full flex items-center justify-center ${
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-brand-deep to-brand-teal text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="size-4" /> : <User className="size-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-muted text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={line === '' ? 'h-2' : ''}>
                        {line.startsWith('•') ? (
                          <span>{line.substring(0, 2)}<span className="font-medium">{line.substring(2)}</span></span>
                        ) : line.includes('**') ? (
                          line.split('**').map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                          )
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                    <p className="text-[10px] mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="size-3" /> Quick Actions
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => handleQuickAction(action.action, action.label)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-teal/10 text-brand-teal rounded-lg text-xs font-medium hover:bg-brand-teal/15 transition-colors"
                  >
                    <action.icon className="size-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
