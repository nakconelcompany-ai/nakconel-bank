import { prisma } from '@/lib/prisma';
import { toKobo, fromKobo } from '@/lib/money';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Date.now().toString(36);
}

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
  const count = await prisma.invoice.count({ where: { businessId: biz.id } });
  const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
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
  amount: number; currency: string; description: string | null; status: string;
  dueDate: Date | null; paidAt: Date | null; createdAt: Date;
}) {
  return {
    id: inv.id, invoiceNumber: inv.invoiceNumber, customerName: inv.customerName,
    customerEmail: inv.customerEmail, amount: fromKobo(inv.amount), amountKobo: inv.amount,
    currency: inv.currency, description: inv.description, status: inv.status,
    dueDate: inv.dueDate?.toISOString() ?? null, paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(), paymentUrl: `https://pay.nakconel.com/invoice/${inv.id}`,
  };
}

export async function createPaymentLink(input: { userId: string; title: string; amountNaira?: number }) {
  const biz = await getOrCreateBusiness(input.userId);
  const slug = slugify(input.title);
  const link = await prisma.paymentLink.create({
    data: {
      businessId: biz.id, title: input.title,
      amount: input.amountNaira != null ? toKobo(input.amountNaira) : null,
      slug, status: 'ACTIVE',
    },
  });
  return formatLink(link);
}

export async function listPaymentLinks(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.paymentLink.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map(formatLink);
}

function formatLink(link: {
  id: string; title: string; amount: number | null; slug: string; status: string;
  collectCount: number; totalCollected: number; createdAt: Date;
}) {
  return {
    id: link.id, title: link.title, amount: link.amount != null ? fromKobo(link.amount) : null,
    slug: link.slug, status: link.status, collectCount: link.collectCount,
    totalCollected: fromKobo(link.totalCollected), url: `https://pay.nakconel.com/l/${link.slug}`,
    createdAt: link.createdAt.toISOString(),
  };
}

export async function recordCollection(input: {
  userId: string; source: 'INVOICE' | 'PAYMENT_LINK' | 'DIRECT'; sourceId?: string;
  amountNaira: number; payerName?: string; payerEmail?: string;
}) {
  const biz = await getOrCreateBusiness(input.userId);
  const reference = `COL-${Date.now().toString(36).toUpperCase()}`;
  const col = await prisma.collection.create({
    data: {
      businessId: biz.id, source: input.source, sourceId: input.sourceId,
      amount: toKobo(input.amountNaira), payerName: input.payerName, payerEmail: input.payerEmail,
      reference, status: 'COMPLETED',
    },
  });
  if (input.source === 'INVOICE' && input.sourceId) {
    await prisma.invoice.update({ where: { id: input.sourceId }, data: { status: 'PAID', paidAt: new Date() } });
  }
  if (input.source === 'PAYMENT_LINK' && input.sourceId) {
    await prisma.paymentLink.update({
      where: { id: input.sourceId },
      data: { collectCount: { increment: 1 }, totalCollected: { increment: toKobo(input.amountNaira) } },
    });
  }
  return { id: col.id, reference: col.reference, amount: fromKobo(col.amount), source: col.source, status: col.status, createdAt: col.createdAt.toISOString() };
}

export async function listCollections(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) return [];
  const rows = await prisma.collection.findMany({ where: { businessId: biz.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map((c) => ({ id: c.id, reference: c.reference, amount: fromKobo(c.amount), source: c.source, payerName: c.payerName, status: c.status, createdAt: c.createdAt.toISOString() }));
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
  return rows.map((e) => ({ id: e.id, category: e.category, title: e.title, amount: fromKobo(e.amount), note: e.note, spentAt: e.spentAt.toISOString() }));
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
  return rows.map((m) => ({ id: m.id, fullName: m.fullName, email: m.email, role: m.role, salary: fromKobo(m.salaryKobo), status: m.status }));
}

export async function payTeamMember(input: { userId: string; teamMemberId: string; amountNaira?: number; period?: string }) {
  const member = await prisma.teamMember.findUnique({ where: { id: input.teamMemberId } });
  if (!member) throw new Error('Team member not found');
  const amount = input.amountNaira != null ? toKobo(input.amountNaira) : member.salaryKobo;
  const pay = await prisma.teamPayment.create({
    data: { teamMemberId: member.id, amount, period: input.period, status: 'PAID', paidAt: new Date() },
  });
  return { id: pay.id, teamMemberId: member.id, fullName: member.fullName, amount: fromKobo(pay.amount), status: pay.status, period: pay.period, paidAt: pay.paidAt?.toISOString() };
}

export async function getAnalytics(userId: string) {
  const biz = await prisma.businessProfile.findFirst({ where: { userId } });
  if (!biz) {
    return { businessName: null, totalCollected: 0, totalExpenses: 0, net: 0, unpaidInvoices: 0, unpaidAmount: 0, activeLinks: 0, teamCount: 0, collectionCount: 0 };
  }
  const [collections, expenses, unpaid, links, team] = await Promise.all([
    prisma.collection.aggregate({ where: { businessId: biz.id }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { businessId: biz.id }, _sum: { amount: true } }),
    prisma.invoice.findMany({ where: { businessId: biz.id, status: { in: ['UNPAID', 'SENT', 'OVERDUE'] } } }),
    prisma.paymentLink.count({ where: { businessId: biz.id, status: 'ACTIVE' } }),
    prisma.teamMember.count({ where: { businessId: biz.id, status: 'ACTIVE' } }),
  ]);
  const totalCollected = fromKobo(collections._sum.amount || 0);
  const totalExpenses = fromKobo(expenses._sum.amount || 0);
  const unpaidAmount = fromKobo(unpaid.reduce((s, i) => s + i.amount, 0));
  return {
    businessName: biz.businessName, totalCollected, totalExpenses, net: totalCollected - totalExpenses,
    unpaidInvoices: unpaid.length, unpaidAmount, activeLinks: links, teamCount: team, collectionCount: collections._count,
  };
}
