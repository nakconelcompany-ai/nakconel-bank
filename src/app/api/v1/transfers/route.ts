import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Bank transfers are unavailable until a licensed payment provider is connected.' },
    { status: 503 }
  );
}
