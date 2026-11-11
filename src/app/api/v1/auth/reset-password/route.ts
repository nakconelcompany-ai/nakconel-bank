import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPasswordResetToken, resetPassword, loginUser } from '@/domains/identity/service';
import { setSessionCookie } from '@/lib/session';

const schema = z.object({
  email:       z.string().email(),
  resetToken:  z.string().min(10),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const { email, resetToken, newPassword } = parsed.data;

  // Verify the reset token (issued after OTP verification)
  const valid = await verifyPasswordResetToken(email, resetToken);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Reset session expired. Please request a new code.' },
      { status: 400 }
    );
  }

  try {
    await resetPassword(email, newPassword);
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Password reset failed.' },
      { status: 400 }
    );
  }

  // Auto-login after reset
  try {
    const user = await loginUser(email, newPassword);
    const response = NextResponse.json({ success: true, data: user });
    setSessionCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ success: true, data: { passwordReset: true } });
  }
}
