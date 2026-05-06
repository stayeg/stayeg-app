import { captureException } from '@/lib/sentry-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('contact_submissions').insert({
      name,
      email,
      subject,
      message,
    });

    if (error) {
      console.error('Error submitting contact form:', error.message);
      return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Contact form submitted' }, { status: 201 });
  } catch (error) {
    captureException(error, { endpoint: 'POST /api/contact' });
    console.error('Error submitting contact form:', error);
    return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 });
  }
}
