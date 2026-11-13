import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { getFxCorridorRecommendations } from '@/domains/ai/service';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const recommendations = getFxCorridorRecommendations();
  return NextResponse.json(recommendations);
}
