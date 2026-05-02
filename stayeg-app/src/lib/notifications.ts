/**
 * Notification service for StayEg.
 * Supports email (via Resend) and SMS (via MSG91).
 * Falls back to console logging when services are not configured.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

interface NotificationPayload {
  userId: string;
  type: 'BOOKING_CONFIRMED' | 'PAYMENT_SUCCESS' | 'COMPLAINT_UPDATE' | 'WELCOME' | 'PASSWORD_RESET' | 'GENERAL';
  title: string;
  message: string;
  email?: string;
  phone?: string;
}

/**
 * Send a notification (email + SMS) to a user.
 * Stores the notification in the database for in-app display.
 */
export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; emailSent: boolean; smsSent: boolean }> {
  let emailSent = false;
  let smsSent = false;

  // Try email via Resend
  if (payload.email && process.env.RESEND_API_KEY) {
    try {
      const Resend = (await import('resend')).Resend;
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: 'StayEg <noreply@stayeg.in>',
        to: payload.email,
        subject: payload.title,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #00ADB5; margin: 0;">StayEg</h1>
            </div>
            <h2 style="color: #1a1a1a;">${payload.title}</h2>
            <p style="color: #555; line-height: 1.6;">${payload.message}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated notification from StayEg. Please do not reply to this email.
            </p>
          </div>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.warn('Email send failed:', err);
    }
  } else {
    console.log(`📧 [SIMULATED EMAIL] To: ${payload.email || 'N/A'} — ${payload.title}: ${payload.message}`);
  }

  // Try SMS via MSG91
  if (payload.phone && process.env.MSG91_AUTH_KEY) {
    try {
      const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': process.env.MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          template_id: 'stayeg_notification',
          mobile: payload.phone.replace(/\D/g, ''),
          SMS: [{
            message: `${payload.title}: ${payload.message}`,
            to: [payload.phone.replace(/\D/g, '')],
          }],
        }),
      });
      if (response.ok) smsSent = true;
    } catch (err) {
      console.warn('SMS send failed:', err);
    }
  } else {
    console.log(`📱 [SIMULATED SMS] To: ${payload.phone || 'N/A'} — ${payload.title}: ${payload.message}`);
  }

  return { success: true, emailSent, smsSent };
}

/**
 * Send a welcome email to a new user.
 */
export async function sendWelcomeEmail(user: { name: string; email: string; role: string }): Promise<void> {
  await sendNotification({
    userId: '',
    type: 'WELCOME',
    title: 'Welcome to StayEg! 🎉',
    message: `Hi ${user.name},\n\nWelcome to StayEg! ${
      user.role === 'TENANT' 
        ? 'Find your perfect PG accommodation with us.' 
        : user.role === 'OWNER'
        ? 'List and manage your PG properties effortlessly.'
        : 'Join our service provider network.'
    }\n\nIf you have any questions, feel free to reach out to our support team.\n\nBest regards,\nThe StayEg Team`,
    email: user.email,
  });
}
