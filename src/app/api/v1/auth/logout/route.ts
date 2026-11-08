import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, hasSameOriginRequest } from '@/lib/session';

export async function POST(request: NextRequest) {
  if (!hasSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'Request origin is not allowed.' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
