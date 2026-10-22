import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/domains/identity/service';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const user = await loginUser(data.email, data.password);
    return NextResponse.json({
      success: true,
      data: {
        ...user,
        token: `dev_${user.id}`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed';
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
