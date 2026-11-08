import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/domains/identity/service';
import { hasSameOriginRequest, setSessionCookie } from '@/lib/session';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!hasSameOriginRequest(req)) {
    return NextResponse.json({ success: false, error: 'Request origin is not allowed.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    const response = NextResponse.json({ success: true, data: user });
    setSessionCookie(response, user.id);
    return response;
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Invalid credentials') {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    console.error('Login failed:', e);
    return NextResponse.json({ success: false, error: 'Login is temporarily unavailable.' }, { status: 500 });
  }
}
