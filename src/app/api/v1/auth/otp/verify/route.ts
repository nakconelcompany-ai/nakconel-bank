/**
 * POST /api/v1/auth/otp/verify
 * Verify an email OTP code.
 *
 * Body: { email: string; code: string; purpose: 'signup' | 'password-reset' }
 * Returns: { valid: true } or 400 error
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyEmailOtp } from '@/domains/identity/service';

const schema = z.object({
  email:   z.string().email(),
  code:    z.string().length(6),
  purpose: z.enum(['signup', 'password-reset']),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email, code, and purpose are required.' }, { status: 400 });
  }

  const valid = await verifyEmailOtp(parsed.data.email, parsed.data.code, parsed.data.purpose);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired code. Please request a new one.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { valid: true } });
}
