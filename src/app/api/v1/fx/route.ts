/**
 * GET /api/v1/fx
 * Returns live FX rates (NGN per 1 unit of each currency).
 * Cached for 1 hour server-side. Response also cacheable by CDN for 10 minutes.
 */
import { NextResponse } from 'next/server';
import { getFxRates } from '@/lib/fx';

export async function GET() {
  const { rates, live, fetchedAt } = await getFxRates();
  return NextResponse.json(
    { success: true, data: { rates, live, fetchedAt, base: 'NGN' } },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    }
  );
}
