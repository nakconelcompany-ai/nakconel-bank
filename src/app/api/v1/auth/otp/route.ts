/**
 * POST /api/v1/auth/otp
 * Send an email OTP via Brevo.
 *
 * Body: { email: string; purpose: 'signup' | 'password-reset' }
 *
 * For password-reset, also verifies the email belongs to an existing account.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveEmailOtp } from '@/domains/identity/service';
import { sendOtpEmail } from '@/lib/brevo';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  email:   z.string().email(),
  purpose: z.enum(['signup', 'password-reset']),
  name:    z.string().min(1).optional(), // used in the email greeting
});

// Simple rate-limit: max 3 OTPs per email per 10 min (stored in memory per instance)
// For production, use Redis; this is fine for Vercel serverless
const recentRequests = new Map<string, number[]>();
function isRateLimited(email: string): boolean {
  const now  = Date.now();
  const key  = email.toLowerCase();
  const hits = (recentRequests.get(key) ?? []).filter(t => now - t < 10 * 60 * 1000);
  if (hits.length >= 3) return true;
  recentRequests.set(key, [...hits, now]);
  return false;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { email, purpose, name } = parsed.data;

  // For password-reset, confirm the email is registered
  if (purpose === 'password-reset') {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Don't reveal whether the email exists — return generic success
      return NextResponse.json({ success: true, data: { sent: true } });
    }
  }

  if (isRateLimited(email)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please wait 10 minutes before requesting another code.' },
      { status: 429 }
    );
  }

  // Generate a 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // Save to DB
  await saveEmailOtp(email, code, purpose);

  // Send via Brevo
  try {
    await sendOtpEmail({
      to:      email,
      toName:  name ?? email.split('@')[0],
      code,
      purpose,
    });
  } catch (e: unknown) {
    console.error('Brevo send failed:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Could not send verification email. Please try again.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, data: { sent: true } });
}
