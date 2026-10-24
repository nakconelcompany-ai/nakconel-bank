import { prisma } from '@/lib/prisma';
import { getAccountBalanceKobo, postJournal } from '@/domains/ledger/service';
import { writeAudit } from '@/lib/audit';

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
  flag: string;
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
    flag: '🌍',
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
    flag: '🇬🇧',
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
    flag: '🇺🇸',
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
    flag: '🏜️',
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
    flag: '🇪🇺',
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

export function quoteInternational(input: {
  corridorId: string;
  countryCode: string;
  amountNgn: number;
}) {
  const corridor = getCorridor(input.corridorId);
  if (!corridor) throw new Error('Unknown corridor');
  const country = corridor.countries.find((c) => c.code === input.countryCode);
  if (!country) throw new Error('Country not supported on this corridor');
  if (input.amountNgn < 1000) throw new Error('Minimum send is ₦1,000');

  const fxRate = FX_BY_CURRENCY[country.currency] ?? corridor.fxBase;
  const feeNgn = Math.max(corridor.feeMinNgn, Math.round(input.amountNgn * (corridor.feePct / 100)));
  const sendNgn = input.amountNgn;
  const totalDebit = sendNgn + feeNgn;
  const amountForeign = Math.round((sendNgn / fxRate) * 100) / 100;

  return {
    corridorId: corridor.id,
    corridorLabel: corridor.label,
    countryCode: country.code,
    countryName: country.name,
    currency: country.currency,
    currencyName: country.currencyName,
    amountNgn: sendNgn,
    feeNgn,
    totalDebitNgn: totalDebit,
    fxRate,
    amountForeign,
    settlementDays: corridor.settlementDays,
    settlementNote: `CBN-aligned international transfer · ${corridor.label} corridor · settles in ${corridor.settlementDays}`,
  };
}

export async function createInternationalTransfer(input: {
  userId: string;
  fromAccountId: string;
  corridorId: string;
  countryCode: string;
  amountNgn: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryBank?: string;
  note?: string;
  idempotencyKey: string;
  pinVerified: boolean;
}) {
  if (!input.pinVerified) throw new Error('PIN required');

  const quote = quoteInternational({
    corridorId: input.corridorId,
    countryCode: input.countryCode,
    amountNgn: input.amountNgn,
  });

  const account = await prisma.account.findFirst({
    where: { id: input.fromAccountId, userId: input.userId },
  });
  if (!account) throw new Error('Account not found');

  const amountKobo = Math.round(quote.amountNgn * 100);
  const feeKobo = Math.round(quote.feeNgn * 100);
  const totalKobo = amountKobo + feeKobo;

  const balance = await getAccountBalanceKobo(input.fromAccountId);
  if (balance < totalKobo) throw new Error('Insufficient balance');

  const transfer = await prisma.$transaction(async (tx) => {
    const t = await tx.internationalTransfer.create({
      data: {
        userId: input.userId,
        fromAccountId: input.fromAccountId,
        corridor: quote.corridorId,
        destinationCountry: quote.countryCode,
        destinationCurrency: quote.currency,
        amountNgnKobo: amountKobo,
        feeKobo,
        fxRate: quote.fxRate,
        amountForeign: quote.amountForeign,
        beneficiaryName: input.beneficiaryName,
        beneficiaryAccount: input.beneficiaryAccount,
        beneficiaryBank: input.beneficiaryBank || null,
        note: input.note || null,
        status: 'PROCESSING',
        settlementNote: quote.settlementNote,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const journal = await postJournal({
      description: `Intl ${quote.corridorLabel} → ${quote.countryName} (${quote.currency})`,
      entries: [
        {
          debitAccountId: input.fromAccountId,
          creditAccountId: `intl:${quote.corridorId}:${input.beneficiaryAccount}`,
          amount: amountKobo,
          reference: t.id,
        },
        {
          debitAccountId: input.fromAccountId,
          creditAccountId: 'fee:nakconel-intl',
          amount: feeKobo,
          reference: `${t.id}-fee`,
        },
      ],
    });

    return tx.internationalTransfer.update({
      where: { id: t.id },
      data: { status: 'COMPLETED', journalId: journal.id },
    });
  });

  await writeAudit({
    userId: input.userId,
    action: 'INTL_TRANSFER',
    resource: 'international_transfer',
    resourceId: transfer.id,
    meta: {
      corridor: quote.corridorId,
      country: quote.countryCode,
      amountNgn: quote.amountNgn,
      currency: quote.currency,
    },
  });

  return {
    id: transfer.id,
    status: transfer.status,
    corridor: transfer.corridor,
    country: transfer.destinationCountry,
    currency: transfer.destinationCurrency,
    amountNgn: quote.amountNgn,
    feeNgn: quote.feeNgn,
    totalDebitNgn: quote.totalDebitNgn,
    fxRate: transfer.fxRate,
    amountForeign: transfer.amountForeign,
    beneficiaryName: transfer.beneficiaryName,
    settlementNote: transfer.settlementNote,
    createdAt: transfer.createdAt,
  };
}

export async function listInternationalTransfers(userId: string) {
  const rows = await prisma.internationalTransfer.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((t) => ({
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
