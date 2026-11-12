import { randomUUID } from 'node:crypto';
import type {
  Collection as BusinessCollection,
  Expense as BusinessExpense,
  Invoice,
  PaymentLink,
  TeamMember,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toKobo, fromKobo } from '@/lib/money';
import {
  getPaystackTestClient,
  getPaymentCallbackUrl,
  type PaystackTransaction,
} from '@/domains/providers/paystack';

export class BusinessCollectionError extends Error {}

export async function getOrCreateBusiness(userId: string, businessName?: string) {
  const existing = await prisma.businessProfile.findFirst({ where: { userId } });
  if (existing) return existing;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return prisma.businessProfile.create({
    data: {
      userId,
      businessName: businessName || `${user?.fullName || 'My'} Business`,
      businessType: 'SME',
    },
  });
}

export async function createInvoice(input: {
  userId: string; customerName: string; customerEmail?: string; customerPhone?: string;
  amountNaira: number; description?: string; dueDate?: string;
}) {
  const biz = await getOrCreateBusiness(input.userId);
  // A random suffix avoids duplicate invoice numbers when requests arrive concurrently.
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const inv = await prisma.invoice.create({
    data: {
      businessId: biz.id, invoiceNumber, customerName: input.customerName,
      customerEmail: input.customerEmail, customerPhone: input.customerPhone,
      amount: toKobo(input.amountNaira), description: input.description,
      status: 'UNPAID', dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
  return formatInvoice(inv);
}

export async function listInvoices(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.invoice.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map(formatInvoice);
}

function formatInvoice(inv: {
  id: string; invoiceNumber: string; customerName: string; customerEmail: string | null;
  amount: number; currency: string; paymentProvider: string; description: string | null; status: string;
  dueDate: Date | null; paidAt: Date | null; createdAt: Date;
}) {
  return {
    id: inv.id, invoiceNumber: inv.invoiceNumber, customerName: inv.customerName,
    customerEmail: inv.customerEmail, amount: fromKobo(inv.amount), amountKobo: inv.amount,
    currency: inv.currency, paymentProvider: inv.paymentProvider, description: inv.description, status: inv.status,
    dueDate: inv.dueDate?.toISOString() ?? null, paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}

export async function createPaymentLink(_input: { userId: string; title: string; amountNaira?: number }) {
  throw new Error('Payment links are unavailable until a payment provider is connected.');
}

export async function listPaymentLinks(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.paymentLink.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map((row: PaymentLink) => ({ ...formatLink(row), status: 'DISABLED' }));
}

function formatLink(link: {
  id: string; title: string; amount: number | null; slug: string; status: string;
  collectCount: number; totalCollected: number; createdAt: Date;
}) {
  return {
    id: link.id, title: link.title, amount: link.amount != null ? fromKobo(link.amount) : null,
    slug: link.slug, status: link.status, collectCount: link.collectCount,
    totalCollected: fromKobo(link.totalCollected),
    createdAt: link.createdAt.toISOString(),
  };
}

export async function initializePaystackCollection(input: {
  userId: string;
  source: 'INVOICE' | 'DIRECT';
  sourceId?: string;
  amountNaira?: number;
  payerName?: string;
  payerEmail?: string;
}) {
  const paystack = getPaystackTestClient();
  const callbackUrl = getPaymentCallbackUrl();
  const business = await getOrCreateBusiness(input.userId);

  let amountKobo: number;
  let payerEmail = input.payerEmail;
  let payerName = input.payerName;

  if (input.source === 'INVOICE') {
    if (!input.sourceId) throw new BusinessCollectionError('An invoice is required.');
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: input.sourceId,
        businessId: business.id,
        status: { in: ['UNPAID', 'SENT', 'OVERDUE'] },
      },
    });
    if (!invoice) throw new BusinessCollectionError('An unpaid invoice for this business was not found.');
    if (!invoice.customerEmail) throw new BusinessCollectionError('Add the customer email to the invoice before collecting payment.');
    amountKobo = invoice.amount;
    payerEmail = invoice.customerEmail;
    payerName = invoice.customerName;
  } else {
    if (!input.amountNaira || !Number.isFinite(input.amountNaira) || !Number.isSafeInteger(input.amountNaira * 100)) {
      throw new BusinessCollectionError('Enter a valid amount with no more than two decimal places.');
    }
    if (input.amountNaira <= 0) throw new BusinessCollectionError('Amount must be greater than zero.');
    amountKobo = toKobo(input.amountNaira);
  }

  if (!Number.isSafeInteger(amountKobo) || amountKobo > 2_147_483_647) {
    throw new BusinessCollectionError('Amount exceeds the supported NGN test collection limit.');
  }
  if (!payerEmail) throw new BusinessCollectionError('A valid payer email is required.');

  const reference = `nak-col-${randomUUID()}`;
  await prisma.collection.create({
    data: {
      businessId: business.id,
      source: input.source,
      sourceId: input.sourceId,
      amount: amountKobo,
      currency: 'NGN',
      provider: 'PAYSTACK_TEST',
      payerName,
      payerEmail,
      reference,
      status: 'PENDING',
    },
  });

  const checkout = await paystack.initializeTransaction({
    email: payerEmail,
    amountKobo,
    reference,
    callbackUrl,
  });
  return {
    reference: checkout.reference,
    authorizationUrl: checkout.authorizationUrl,
    amount: fromKobo(amountKobo),
    currency: 'NGN',
    status: 'PENDING',
  };
}

export async function verifyAndRecordPaystackCollection(reference: string) {
  const paystack = getPaystackTestClient();
  const collection = await prisma.collection.findUnique({ where: { reference } });
  if (!collection) throw new BusinessCollectionError('Collection reference not found.');
  if (collection.provider !== 'PAYSTACK_TEST') throw new BusinessCollectionError('Collection is not a Paystack test transaction.');

  if (collection.status === 'COMPLETED') return { status: 'COMPLETED' as const };
  if (collection.status !== 'PENDING') return { status: collection.status };

  const transaction: PaystackTransaction = await paystack.verifyTransaction(reference);
  if (
    transaction.reference !== reference ||
    transaction.amount !== collection.amount ||
    transaction.currency !== collection.currency
  ) {
    throw new BusinessCollectionError('Verified payment details do not match the pending collection.');
  }

  if (transaction.status !== 'success') {
    if (transaction.status === 'failed' || transaction.status === 'abandoned') {
      const failed = await prisma.collection.updateMany({
        where: { id: collection.id, provider: 'PAYSTACK_TEST', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      if (failed.count > 0) return { status: 'FAILED' as const };
      const latest = await prisma.collection.findUnique({ where: { id: collection.id } });
      return { status: latest?.status ?? 'FAILED' };
    }
    return { status: 'PENDING' as const };
  }

  if (collection.source === 'INVOICE' && collection.sourceId) {
    const updated = await prisma.$queryRaw<Array<{ id: string }>>`
      WITH paid_invoice AS (
        UPDATE "Invoice"
        SET "status" = 'PAID', "paymentProvider" = 'PAYSTACK_TEST', "paidAt" = NOW()
        WHERE "id" = ${collection.sourceId}
          AND "businessId" = ${collection.businessId}
          AND "status" IN ('UNPAID', 'SENT', 'OVERDUE')
          AND EXISTS (
            SELECT 1
            FROM "Collection"
            WHERE "id" = ${collection.id}
              AND "provider" = 'PAYSTACK_TEST'
              AND "status" = 'PENDING'
          )
        RETURNING "id", "businessId"
      )
      UPDATE "Collection" AS c
      SET "status" = 'COMPLETED',
          "payerEmail" = ${transaction.customer?.email ?? collection.payerEmail}
      FROM paid_invoice
      WHERE c."id" = ${collection.id}
        AND c."businessId" = paid_invoice."businessId"
        AND c."sourceId" = paid_invoice."id"
        AND c."status" = 'PENDING'
      RETURNING c."id"
    `;
    if (updated.length > 0) return { status: 'COMPLETED' as const };
  } else {
    const updated = await prisma.collection.updateMany({
      where: { id: collection.id, provider: 'PAYSTACK_TEST', status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        payerEmail: transaction.customer?.email ?? collection.payerEmail,
      },
    });
    if (updated.count > 0) return { status: 'COMPLETED' as const };
  }

  await prisma.collection.updateMany({
    where: { id: collection.id, provider: 'PAYSTACK_TEST', status: 'PENDING' },
    data: { status: 'REQUIRES_REVIEW' },
  });
  const latest = await prisma.collection.findUnique({ where: { id: collection.id } });
  return { status: latest?.status ?? 'REQUIRES_REVIEW' };
}

export async function listCollections(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.collection.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map((c: BusinessCollection) => ({
    id: c.id,
    reference: c.reference,
    amount: fromKobo(c.amount),
    currency: c.currency,
    source: c.source,
    payerName: c.payerName,
    status: c.provider === 'PAYSTACK_TEST' ? c.status : 'UNVERIFIED',
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function createExpense(input: { userId: string; category: string; title: string; amountNaira: number; note?: string }) {
  const biz = await getOrCreateBusiness(input.userId);
  const exp = await prisma.expense.create({
    data: { businessId: biz.id, category: input.category, title: input.title, amount: toKobo(input.amountNaira), note: input.note },
  });
  return { id: exp.id, category: exp.category, title: exp.title, amount: fromKobo(exp.amount), note: exp.note, spentAt: exp.spentAt.toISOString() };
}

export async function listExpenses(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.expense.findMany({ where: { businessId: biz.id }, orderBy: { spentAt: 'desc' }, take: 50 });
  return rows.map((e: BusinessExpense) => ({ id: e.id, category: e.category, title: e.title, amount: fromKobo(e.amount), note: e.note, spentAt: e.spentAt.toISOString() }));
}

export async function addTeamMember(input: { userId: string; fullName: string; email: string; role?: string; salaryNaira?: number }) {
  const biz = await getOrCreateBusiness(input.userId);
  const m = await prisma.teamMember.create({
    data: {
      businessId: biz.id, fullName: input.fullName, email: input.email,
      role: input.role || 'STAFF', salaryKobo: input.salaryNaira != null ? toKobo(input.salaryNaira) : 0,
    },
  });
  return { id: m.id, fullName: m.fullName, email: m.email, role: m.role, salary: fromKobo(m.salaryKobo), status: m.status };
}

export async function listTeam(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.teamMember.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: 'desc' } });
  return rows.map((m: TeamMember) => ({ id: m.id, fullName: m.fullName, email: m.email, role: m.role, salary: fromKobo(m.salaryKobo), status: m.status }));
}

export async function payTeamMember(_input: { userId: string; teamMemberId: string; amountNaira?: number; period?: string }) {
  throw new Error('Payroll transfers are unavailable until a licensed payment provider is connected.');
}

export async function getAnalytics(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) {
    return { businessName: null, totalCollected: 0, totalExpenses: 0, net: 0, unpaidInvoices: 0, unpaidAmount: 0, activeLinks: 0, teamCount: 0, collectionCount: 0 };
  }
  const [collections, expenses, unpaid, team] = await Promise.all([
    prisma.collection.aggregate({ where: { businessId: biz.id, provider: 'PAYSTACK_TEST', status: 'COMPLETED' }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { businessId: biz.id }, _sum: { amount: true } }),
    prisma.invoice.findMany({ where: { businessId: biz.id, status: { in: ['UNPAID', 'SENT', 'OVERDUE'] } } }),
    prisma.teamMember.count({ where: { businessId: biz.id, status: 'ACTIVE' } }),
  ]);
  const totalCollected = fromKobo(collections._sum.amount || 0);
  const totalExpenses = fromKobo(expenses._sum.amount || 0);
  const unpaidAmount = fromKobo(unpaid.reduce((s: number, i: Invoice) => s + i.amount, 0));
  return {
    businessName: biz.businessName, totalCollected, totalExpenses, net: totalCollected - totalExpenses,
    unpaidInvoices: unpaid.length, unpaidAmount, activeLinks: 0, teamCount: team, collectionCount: collections._count,
  };
}
