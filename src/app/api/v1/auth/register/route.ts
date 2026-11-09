import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerUser } from '@/domains/identity/service';
import { hasSameOriginRequest, setSessionCookie } from '@/lib/session';

const schema = z.object({
  phone: z.string().min(10).max(15),
  fullName: z.string().min(2).max(80),
  email: z.string().email().optional(),
  password: z.string().min(6),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
  bvn: z.string().length(11).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
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
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { success: false, error: first?.message ?? 'Invalid registration data.' },
      { status: 400 }
    );
  }

  // phone is required in new flow
  if (!parsed.data.phone) {
    return NextResponse.json({ success: false, error: 'Phone number is required.' }, { status: 400 });
  }

  try {
    const user = await registerUser({
      phone: parsed.data.phone!,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      password: parsed.data.password,
      pin: parsed.data.pin,
      bvn: parsed.data.bvn,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address,
    });
    const response = NextResponse.json({ success: true, data: user }, { status: 201 });
    setSessionCookie(response, user.id);
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Registration failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
