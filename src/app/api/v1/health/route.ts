import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'nakconel-api',
    version: '0.1.0',
    phase: 1,
    time: new Date().toISOString(),
  });
}
