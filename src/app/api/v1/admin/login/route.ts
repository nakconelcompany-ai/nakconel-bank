import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/domains/identity/service';
import { clearSessionCookie, hasSameOriginRequest, setAdminSessionCookie } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { sendLoginAlertEmail } from '@/lib/brevo';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!hasSameOriginRequest(req)) {
    return NextResponse.json({ success: false, error: 'Request origin is not allowed.' }, { status: 403 });
  }
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);

    // Only allow owner or admin roles
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'This account does not have admin access.' },
        { status: 403 }
      );
    }

    // Legacy admin profiles may have been provisioned with a customer wallet.
    // Close those customer accounts on admin sign-in; keep the internal gift pool
    // intact and preserve all immutable journal history.
    await prisma.account.updateMany({
      where: { userId: user.id, accountNumber: { not: 'GIFT_POOL_NGN' } },
      data: { status: 'CLOSED', accountNumber: null },
    });

    const response = NextResponse.json({ success: true, data: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    clearSessionCookie(response);
    setAdminSessionCookie(response, user.id);

    // Fire login alert (non-blocking)
    const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
    const now = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
    sendLoginAlertEmail({ to: user.email, toName: user.fullName, time: now, ip }).catch(() => {});

    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed';
    if (msg === 'Invalid credentials') {
      return NextResponse.json({ success: false, error: 'Email or password is incorrect.' }, { status: 401 });
    }
    console.error('Admin login error:', String(e));
    return NextResponse.json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
