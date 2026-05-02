import { NextRequest, NextResponse } from 'next/server';
import type { ChatMessage } from 'z-ai-web-dev-sdk';
import { requireSession } from '@/lib/api-auth';

const SYSTEM_PROMPT = `You are StayEg AI Assistant, a helpful chatbot for India's leading PG (Paying Guest) accommodation platform.

Your role:
- Help tenants find PGs, understand booking process, payment options
- Help PG owners manage properties, tenants, rent collection
- Answer questions about the platform features
- Guide users through onboarding

Key info about StayEg:
- Platform for finding and managing PG accommodations in India
- Cities: Bangalore, Delhi, Mumbai, Pune, Hyderabad, Chennai
- Features: PG listing, booking, rent management, complaints, vendor management
- Pricing: Free for tenants, subscription plans for PG owners
- Support: support@stayeg.in, +91 80-4567-8900

Be concise, friendly, and helpful. If you don't know something, suggest contacting support.
Keep responses under 150 words unless the user asks for detailed help.`;

export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent SDK quota abuse
    const authResult = await requireSession(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Dynamic import of z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default;

    const zai = await ZAI.create();

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (context) {
      messages.push({
        role: 'user',
        content: `[User context: ${context}]\n\n${message}`,
      });
    } else {
      messages.push({
        role: 'user',
        content: message,
      });
    }

    const completion = await zai.chat.completions.create({ messages });

    const reply =
      completion?.choices?.[0]?.message?.content ??
      completion?.choices?.[0]?.text ??
      (typeof completion === 'string' ? completion : JSON.stringify(completion));

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
  }
}
