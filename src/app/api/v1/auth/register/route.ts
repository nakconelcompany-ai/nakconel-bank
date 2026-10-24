import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerUser } from '@/domains/identity/service';

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(6),
  pin: z.string().regex(/^\d{4}$/),
  phone: z.string().min(10).max(15).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const user = await registerUser(data);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Registration failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
