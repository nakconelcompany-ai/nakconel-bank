/**
 * POST /api/v1/auth/reset-password
 * Reset password after OTP verification.
 *
 * Body: { email: string; code: string; newPassword: string }
 * The code is verified and consumed here (single-step).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyEmailOtp, resetPassword } from '@/domains/identity/service';
import { setSessionCookie } from '@/lib/session';
import { loginUser } from '@/domains/identity/service';

const schema = z.object({
  email:       z.string().email(),
  code:        z.string().length(6),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { email, code, newPassword } = parsed.data;

  // Verify OTP (this also consumes it)
  const valid = await verifyEmailOtp(email, code, 'password-reset');
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired code. Please request a new one.' },
      { status: 400 }
    );
  }

  // Reset the password
  try {
    await resetPassword(email, newPassword);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Password reset failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  // Auto-login after reset
  try {
    const user = await loginUser(email, newPassword);
    const response = NextResponse.json({ success: true, data: user });
    setSessionCookie(response, user.id);
    return response;
  } catch {
    // Reset worked but auto-login failed — user can log in manually
    return NextResponse.json({ success: true, data: { passwordReset: true } });
  }
}
