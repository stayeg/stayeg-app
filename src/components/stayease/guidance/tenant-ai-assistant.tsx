'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Bot, User, Sparkles, Search,
  CreditCard, AlertCircle, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api-client';
import { useAppStore } from '@/store/use-app-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'Find PG', icon: Search, action: 'find_pg' },
  { label: 'My Bookings', icon: CreditCard, action: 'my_bookings' },
  { label: 'Payment Help', icon: CreditCard, action: 'payment_help' },
  { label: 'Complaints', icon: AlertCircle, action: 'complaints' },
];

const AI_RESPONSES: Record<string, string> = {
  find_pg:
    "I'd love to help you find the perfect PG! 🔍\n\nHere's how you can search:\n1. Use the **search bar** at the top to enter a location\n2. Apply **filters** for budget, amenities, and gender preference\n3. Browse the listings and tap for details\n4. Book your preferred bed instantly!\n\nWould you like me to show you available PGs near you?",
  my_bookings:
    "Let me check your bookings for you! 📋\n\nYou can view all your bookings in the **My Bookings** section:\n• See active and past bookings\n• Track booking status\n• View payment history\n• Download receipts\n\nNavigate there from the menu to see the full details.",
  payment_help:
    "Here's how payments work on StayEg! 💳\n\n• **Advance Payment**: Pay a small amount to confirm your booking\n• **Monthly Rent**: Pay rent via UPI, cards, or net banking\n• **Security Deposit**: One-time refundable deposit\n• **Coupons**: Apply discount codes at checkout!\n\nAll transactions are 100% secure and you get instant digital receipts.",
  complaints:
    "Having trouble? I'm here to help! ⚠️\n\nYou can raise a complaint from the **Complaints** section:\n• Choose category: Maintenance, Cleanliness, Noise, Safety\n• Set priority: Low, Medium, High, Urgent\n• Track status in real-time\n• Get notified when resolved\n\nYour PG owner will be notified immediately.",
};

const DEFAULT_RESPONSE =
  "I'd be happy to help you! Here are some things I can assist with:\n\n• Find a PG near you\n• Check booking status\n• Payment help & guidance\n• Raise & track complaints\n• Community tips & roommates\n\nTry asking about any of these topics or use the quick actions below! 😊";

export default function TenantAIAssistant() {
  const { currentRole } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hi! I'm your StayEg assistant. How can I help you today? 👋",
      timestamp: new Date(),
    },
    {
      id: 'welcome-2',
      role: 'assistant',
      content:
        'Here are some things I can help with:\n• Find a PG near you\n• Check booking status\n• Payment help\n• Complaint guidance\n• Community tips',
      timestamp: new Date(Date.now() + 1),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Only render for tenant role
  if (currentRole !== 'TENANT') return null;

  const handleQuickAction = (action: string, label: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: label,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content:
          AI_RESPONSES[action] ||
          "I'm processing your request. Let me fetch the information for you...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
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
        setMessages((prev) => [...prev, aiMsg]);
      });
    }, 600);
  };

  const getFallbackResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (
      q.includes('pg') ||
      q.includes('find') ||
      q.includes('search') ||
      q.includes('room') ||
      q.includes('accommodation')
    )
      return AI_RESPONSES.find_pg;
    if (
      q.includes('book') ||
      q.includes('booking') ||
      q.includes('status') ||
      q.includes('my booking')
    )
      return AI_RESPONSES.my_bookings;
    if (
      q.includes('pay') ||
      q.includes('payment') ||
      q.includes('rent') ||
      q.includes('upi') ||
      q.includes('money') ||
      q.includes('due')
    )
      return AI_RESPONSES.payment_help;
    if (
      q.includes('complaint') ||
      q.includes('issue') ||
      q.includes('problem') ||
      q.includes('maintenance') ||
      q.includes('broken')
    )
      return AI_RESPONSES.complaints;
    if (
      q.includes('coupon') ||
      q.includes('discount') ||
      q.includes('offer')
    )
      return "Great news! We have active coupons you can use! 🎉\n\n• **STAYEG500** - Flat ₹500 off on first booking\n• **RENT10** - 10% off on monthly rent payment\n\nApply coupons at checkout to save on your bookings!";
    if (
      q.includes('community') ||
      q.includes('roommate') ||
      q.includes('social')
    )
      return "Join the StayEg community! 🤝\n\nYou can:\n• Find roommates in your area\n• Join interest-based groups\n• Share tips and recommendations\n• Discover nearby events\n\nCheck out the Community section to get started!";
    return DEFAULT_RESPONSE;
  };

  const getAIResponse = async (question: string): Promise<string> => {
    try {
      const res = await authFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          context: 'Tenant',
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return data.reply || "I'm sorry, I couldn't process that. Please try again.";
    } catch {
      return getFallbackResponse(question);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 sm:right-6 z-40 bg-brand-teal text-white size-14 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow border border-white/20"
            aria-label="Open StayEg Assistant"
          >
            <MessageSquare className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
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
                  <h3 className="font-semibold">StayEg Assistant</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="size-1.5 bg-green-400 rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
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
                  className={`flex gap-2 ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`shrink-0 size-8 rounded-full flex items-center justify-center ${
                      msg.role === 'assistant'
                        ? 'bg-gradient-to-br from-brand-deep to-brand-teal text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <Bot className="size-4" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-muted text-foreground rounded-tl-sm'
                        : 'bg-primary text-primary-foreground rounded-tr-sm'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={line === '' ? 'h-2' : ''}>
                        {line.startsWith('•') ? (
                          <span>
                            {line.substring(0, 2)}
                            <span className="font-medium">
                              {line.substring(2)}
                            </span>
                          </span>
                        ) : line.includes('**') ? (
                          line.split('**').map((part, j) =>
                            j % 2 === 1 ? (
                              <strong key={j}>{part}</strong>
                            ) : (
                              part
                            )
                          )
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                    <p className="text-[10px] mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
                    onClick={() =>
                      handleQuickAction(action.action, action.label)
                    }
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
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
