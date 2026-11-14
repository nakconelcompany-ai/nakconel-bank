import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/domains/identity/service';
import { clearAdminSessionCookie, hasSameOriginRequest, setSessionCookie } from '@/lib/session';
import { sendLoginAlertEmail } from '@/lib/brevo';

const schema = z.object({
  email:    z.string().min(7).max(100),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!hasSameOriginRequest(req)) {
    return NextResponse.json({ success: false, error: 'Request origin is not allowed.' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Phone/email and password are required.' }, { status: 400 });
  }

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    if (user.role === 'owner' || user.role === 'admin' || user.role === 'support' || user.role === 'system') {
      return NextResponse.json({ success: false, error: 'This is an administration account. Sign in through the admin portal.' }, { status: 403 });
    }
    const response = NextResponse.json({ success: true, data: user });
    clearAdminSessionCookie(response);
    setSessionCookie(response, user.id);

    // Fire login alert email (non-blocking — don't await)
    const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? undefined;
    const now = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
    sendLoginAlertEmail({ to: user.email, toName: user.fullName, time: now, ip }).catch(() => {});

    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed';
    if (msg === 'Invalid credentials') {
      return NextResponse.json({ success: false, error: 'Phone number or password is incorrect.' }, { status: 401 });
    }
    console.error('Login error:', String(e));
    return NextResponse.json({ success: false, error: `Login failed: ${e instanceof Error ? e.message : 'Unknown error'}` }, { status: 500 });
  }
}
