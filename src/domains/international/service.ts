import { prisma } from '@/lib/prisma';
import { getRate } from '@/lib/fx';

export type CorridorId = 'AFRICA' | 'UK' | 'US' | 'GCC' | 'EUROPE';

export type CorridorCountry = {
  code: string;
  name: string;
  currency: string;
  currencyName: string;
};

export type Corridor = {
  id: CorridorId;
  label: string;
  subtitle: string;
  fxBase: number;
  feePct: number;
  feeMinNgn: number;
  settlementDays: string;
  countries: CorridorCountry[];
};

export const CORRIDORS: Corridor[] = [
  {
    id: 'AFRICA',
    label: 'Africa',
    subtitle: 'Ghana, Kenya, South Africa & more',
    fxBase: 15.2,
    feePct: 1.2,
    feeMinNgn: 500,
    settlementDays: 'Same day – 1 business day',
    countries: [
      { code: 'GH', name: 'Ghana', currency: 'GHS', currencyName: 'Cedi' },
      { code: 'KE', name: 'Kenya', currency: 'KES', currencyName: 'Shilling' },
      { code: 'ZA', name: 'South Africa', currency: 'ZAR', currencyName: 'Rand' },
      { code: 'RW', name: 'Rwanda', currency: 'RWF', currencyName: 'Franc' },
      { code: 'UG', name: 'Uganda', currency: 'UGX', currencyName: 'Shilling' },
    ],
  },
  {
    id: 'UK',
    label: 'United Kingdom',
    subtitle: 'GBP bank & wallet payouts',
    fxBase: 2100,
    feePct: 1.5,
    feeMinNgn: 1500,
    settlementDays: '1–2 business days',
    countries: [{ code: 'GB', name: 'United Kingdom', currency: 'GBP', currencyName: 'Pound' }],
  },
  {
    id: 'US',
    label: 'United States',
    subtitle: 'USD ACH & wire partners',
    fxBase: 1650,
    feePct: 1.5,
    feeMinNgn: 2000,
    settlementDays: '1–3 business days',
    countries: [{ code: 'US', name: 'United States', currency: 'USD', currencyName: 'Dollar' }],
  },
  {
    id: 'GCC',
    label: 'GCC',
    subtitle: 'UAE, Saudi Arabia & Gulf',
    fxBase: 450,
    feePct: 1.8,
    feeMinNgn: 2000,
    settlementDays: '1–2 business days',
    countries: [
      { code: 'AE', name: 'United Arab Emirates', currency: 'AED', currencyName: 'Dirham' },
      { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencyName: 'Riyal' },
      { code: 'QA', name: 'Qatar', currency: 'QAR', currencyName: 'Riyal' },
    ],
  },
  {
    id: 'EUROPE',
    label: 'Europe',
    subtitle: 'Eurozone SEPA corridors',
    fxBase: 1780,
    feePct: 1.6,
    feeMinNgn: 1800,
    settlementDays: '1–2 business days',
    countries: [
      { code: 'DE', name: 'Germany', currency: 'EUR', currencyName: 'Euro' },
      { code: 'FR', name: 'France', currency: 'EUR', currencyName: 'Euro' },
      { code: 'NL', name: 'Netherlands', currency: 'EUR', currencyName: 'Euro' },
      { code: 'IE', name: 'Ireland', currency: 'EUR', currencyName: 'Euro' },
    ],
  },
];

const FX_BY_CURRENCY: Record<string, number> = {
  GHS: 105,
  KES: 12.5,
  ZAR: 92,
  RWF: 1.15,
  UGX: 0.44,
  GBP: 2100,
  USD: 1650,
  AED: 450,
  SAR: 440,
  QAR: 453,
  EUR: 1780,
};

export function getCorridor(id: string): Corridor | undefined {
  return CORRIDORS.find((c) => c.id === id);
}

export async function quoteInternational(input: {
  corridorId: string;
  countryCode: string;
  amountNgn: number;
}) {
  const corridor = getCorridor(input.corridorId);
  if (!corridor) throw new Error('Unknown corridor');
  const country = corridor.countries.find((c) => c.code === input.countryCode);
  if (!country) throw new Error('Country not supported on this corridor');
  if (input.amountNgn < 1000) throw new Error('Minimum send is ₦1,000');

  // Use live rate; fall back to hardcoded corridor base rate
  const liveFxRate = await getRate(country.currency).catch(() => null);
  const fxRate = liveFxRate && liveFxRate > 0 ? liveFxRate : (FX_BY_CURRENCY[country.currency] ?? corridor.fxBase);

  const feeNgn = Math.max(corridor.feeMinNgn, Math.round(input.amountNgn * (corridor.feePct / 100)));
  const sendNgn = input.amountNgn;
  const totalDebit = sendNgn + feeNgn;
  const amountForeign = Math.round((sendNgn / fxRate) * 100) / 100;

  return {
    corridorId:    corridor.id,
    corridorLabel: corridor.label,
    countryCode:   country.code,
    countryName:   country.name,
    currency:      country.currency,
    currencyName:  country.currencyName,
    amountNgn:     sendNgn,
    feeNgn,
    totalDebitNgn: totalDebit,
    fxRate,
    amountForeign,
    settlementDays:  corridor.settlementDays,
    settlementNote: `CBN-aligned international transfer · ${corridor.label} corridor · settles in ${corridor.settlementDays}`,
  };
}

export async function createInternationalTransfer(): Promise<never> {
  throw new Error('International transfers are unavailable until a licensed payment provider is connected.');
}

export async function listInternationalTransfers(userId: string) {
  const rows = await prisma.internationalTransfer.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((t: {
    id: string; status: string; corridor: string; destinationCountry: string;
    destinationCurrency: string; amountNgnKobo: number; feeKobo: number;
    amountForeign: number; fxRate: number; beneficiaryName: string; createdAt: Date;
  }) => ({
    id: t.id,
    status: t.status,
    corridor: t.corridor,
    country: t.destinationCountry,
    currency: t.destinationCurrency,
    amountNgn: t.amountNgnKobo / 100,
    feeNgn: t.feeKobo / 100,
    amountForeign: t.amountForeign,
    fxRate: t.fxRate,
    beneficiaryName: t.beneficiaryName,
    createdAt: t.createdAt,
  }));
}
