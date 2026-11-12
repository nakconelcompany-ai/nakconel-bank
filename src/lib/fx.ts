/**
 * Live FX rates — NGN as base currency.
 * Uses exchangerate-api.com open endpoint (no API key, 1500 req/month free).
 * Falls back to hardcoded rates if the API is unreachable.
 * Cached in memory for 1 hour per serverless instance.
 */

export type FxRates = Record<string, number>; // currency code → NGN per 1 unit

/** Hardcoded fallback rates (NGN per 1 unit of foreign currency) */
const FALLBACK: FxRates = {
  USD: 1650, GBP: 2100, EUR: 1780, AED: 450,  SAR: 440,  QAR: 453,
  GHS: 105,  KES: 12.5, ZAR: 92,   RWF: 1.15, UGX: 0.44, TZS: 0.62,
  CAD: 1210, AUD: 1070, NZD: 980,  SGD: 1230, HKD: 212,
  JPY: 11,   CNY: 230,  KRW: 1.22, INR: 20,   PHP: 29,   THB: 46,
  MYR: 350,  IDR: 0.105,BRL: 310,  MXN: 95,   CHF: 1850, SEK: 155,
  NOK: 155,  PLN: 410,  EGP: 50,   ETB: 55,   XOF: 2.55, BHD: 4380,
  KWD: 5370,
};

let cache: { rates: FxRates; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Fetch live rates from exchangerate-api.com (NGN base) */
async function fetchLiveRates(): Promise<FxRates> {
  const res = await fetch(
    'https://open.er-api.com/v6/latest/NGN',
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!res.ok) throw new Error(`FX API returned ${res.status}`);
  const data = await res.json() as { result: string; rates: Record<string, number> };
  if (data.result !== 'success' || !data.rates) throw new Error('Invalid FX response');

  // The API returns how many units of each currency you get per 1 NGN.
  // We need the inverse: how many NGN per 1 unit of foreign currency.
  const rates: FxRates = {};
  for (const [code, perNgn] of Object.entries(data.rates)) {
    if (perNgn && perNgn > 0 && code !== 'NGN') {
      rates[code] = Math.round((1 / perNgn) * 10000) / 10000; // NGN per 1 unit
    }
  }
  return rates;
}

/** Get FX rates (live with 1-hour cache, fallback on error) */
export async function getFxRates(): Promise<{ rates: FxRates; live: boolean; fetchedAt: number }> {
  const now = Date.now();

  // Return cached rates if fresh
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { rates: cache.rates, live: true, fetchedAt: cache.fetchedAt };
  }

  try {
    const rates = await fetchLiveRates();
    // Merge with fallback so we always have all currencies
    const merged = { ...FALLBACK, ...rates };
    cache = { rates: merged, fetchedAt: now };
    console.log(JSON.stringify({ level: 'info', msg: 'FX rates refreshed', currencies: Object.keys(rates).length }));
    return { rates: merged, live: true, fetchedAt: now };
  } catch (e) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'FX live rates unavailable, using fallback', error: String(e) }));
    // Use stale cache if available, otherwise use fallback
    const rates = cache?.rates ?? FALLBACK;
    return { rates, live: false, fetchedAt: cache?.fetchedAt ?? now };
  }
}

/** Get a single rate (NGN per 1 unit of currency). Returns fallback if unknown. */
export async function getRate(currencyCode: string): Promise<number> {
  if (currencyCode === 'NGN') return 1;
  const { rates } = await getFxRates();
  return rates[currencyCode] ?? FALLBACK[currencyCode] ?? 1;
}
