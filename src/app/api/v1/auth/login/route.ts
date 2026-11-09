import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/domains/identity/service';
import { hasSameOriginRequest, setSessionCookie } from '@/lib/session';

const schema = z.object({
  // Accept phone OR email in the same field
  email: z.string().min(7).max(100),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!hasSameOriginRequest(req)) {
    return NextResponse.json(
      { success: false, error: 'Request origin is not allowed.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Phone/email and password are required.' },
      { status: 400 }
    );
  }

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    const response = NextResponse.json({ success: true, data: user });
    setSessionCookie(response, user.id);
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed';
    if (msg === 'Invalid credentials') {
      return NextResponse.json(
        { success: false, error: 'Phone number or password is incorrect.' },
        { status: 401 }
      );
    }
    console.error('Login error:', e);
    return NextResponse.json(
      { success: false, error: 'Login is temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
