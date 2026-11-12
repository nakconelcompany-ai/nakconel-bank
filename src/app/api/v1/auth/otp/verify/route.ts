import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyEmailOtp, issuePasswordResetToken, issueSignupVerificationToken } from '@/domains/identity/service';

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

  // For password-reset: issue a short-lived token so the client can call
  // /api/v1/auth/reset-password without re-verifying the OTP (it's consumed)
  if (parsed.data.purpose === 'password-reset') {
    const resetToken = await issuePasswordResetToken(parsed.data.email);
    return NextResponse.json({ success: true, data: { valid: true, resetToken } });
  }

  const signupVerificationToken = await issueSignupVerificationToken(parsed.data.email);
  return NextResponse.json({ success: true, data: { valid: true, signupVerificationToken } });
}
