const base = '';

export type Session = {
  id: string;
  email: string;
  fullName: string;
  accountId?: string;
  kycStatus?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

async function readApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const body = await res.text();
  try {
    return JSON.parse(body) as ApiResponse<T>;
  } catch {
    if (!res.ok) {
      throw new Error(`Request failed with HTTP ${res.status}. Please try again.`);
    }
    throw new Error('The server returned an invalid response. Please try again.');
  }
}

export async function apiRegister(body: {
  email: string;
  fullName: string;
  password: string;
  pin: string;
  phone?: string;
}) {
  const res = await fetch(`${base}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await readApiResponse<{ id: string; email: string; fullName: string; accountId?: string }>(res);
  if (!res.ok || !json.success) throw new Error(json.error || 'Registration failed');
  return json.data as { id: string; email: string; fullName: string; accountId?: string };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await readApiResponse<Session>(res);
  if (!res.ok || !json.success) throw new Error(json.error || 'Login failed');
  return json.data as Session;
}

export async function apiSession() {
  const res = await fetch('/api/v1/auth/session');
  const json = await readApiResponse<Session>(res);
  if (!res.ok || !json.success) throw new Error(json.error || 'Session validation failed');
  return json.data as Session;
}

export async function apiLogout() {
  const res = await fetch('/api/v1/auth/logout', { method: 'POST' });
  const json = await readApiResponse<{ success: boolean }>(res);
  if (!res.ok || !json.success) throw new Error(json.error || 'Logout failed');
}

export async function apiBalance(accountId: string) {
  const res = await fetch(
    `${base}/api/v1/accounts/balance?accountId=${encodeURIComponent(accountId)}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Balance failed');
  return json.data as {
    accountId: string;
    balanceKobo: number;
    balance: number;
    formatted: string;
    currency: string;
  };
}

export async function apiTransfer(input: {
  userId: string;
  fromAccountId: string;
  amount: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  note?: string;
  pin: string;
  idempotencyKey: string;
}) {
  const res = await fetch(`${base}/api/v1/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Transfer failed');
  return json.data;
}

export async function apiBizProfile(businessName?: string) {
  const res = await fetch('/api/v1/business/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Business profile failed');
  return json.data;
}

export async function apiBizAnalytics() {
  const res = await fetch('/api/v1/business/analytics');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Analytics failed');
  return json.data as {
    businessName: string | null;
    totalCollected: number;
    totalExpenses: number;
    net: number;
    unpaidInvoices: number;
    unpaidAmount: number;
    activeLinks: number;
    teamCount: number;
    collectionCount: number;
  };
}

export async function apiCreateInvoice(body: {
  customerName: string;
  customerEmail?: string;
  amount: number;
  description?: string;
}) {
  const res = await fetch('/api/v1/business/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Invoice failed');
  return json.data;
}

export async function apiListInvoices() {
  const res = await fetch('/api/v1/business/invoices');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'List invoices failed');
  return json.data as Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string | null;
    amount: number;
    paymentProvider: string;
    status: string;
    createdAt: string;
  }>;
}

export async function apiListPaymentLinks() {
  const res = await fetch('/api/v1/business/payment-links');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'List links failed');
  return json.data as Array<{
    id: string;
    title: string;
    amount: number | null;
    status: string;
    collectCount: number;
  }>;
}

export async function apiListCollections() {
  const res = await fetch('/api/v1/business/collections');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Collections failed');
  return json.data as Array<{
    id: string;
    reference: string;
    amount: number;
    currency: string;
    source: string;
    payerName: string | null;
    status: string;
    createdAt: string;
  }>;
}

export async function apiStartBusinessCollection(input:
  | { source: 'INVOICE'; sourceId: string }
  | { source: 'DIRECT'; amount: number; payerName?: string; payerEmail: string }
) {
  const res = await fetch('/api/v1/business/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Could not start collection');
  return json.data as {
    reference: string;
    authorizationUrl: string;
    amount: number;
    currency: string;
    status: string;
  };
}

export async function apiCreateExpense(body: {
  category: string;
  title: string;
  amount: number;
  note?: string;
}) {
  const res = await fetch('/api/v1/business/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Expense failed');
  return json.data;
}

export async function apiListExpenses() {
  const res = await fetch('/api/v1/business/expenses');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'List expenses failed');
  return json.data as Array<{ id: string; category: string; title: string; amount: number; spentAt: string }>;
}

export async function apiAddTeamMember(body: {
  fullName: string;
  email: string;
  role?: string;
  salary?: number;
}) {
  const res = await fetch('/api/v1/business/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Team member failed');
  return json.data;
}

export async function apiListTeam() {
  const res = await fetch('/api/v1/business/team');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'List team failed');
  return json.data as Array<{ id: string; fullName: string; email: string; role: string; salary: number; status: string }>;
}

export async function apiPayTeamMember(body: {
  userId: string;
  teamMemberId: string;
  amount?: number;
  period?: string;
}) {
  const res = await fetch('/api/v1/business/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, action: 'pay' }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Team pay failed');
  return json.data;
}

// Phase 3 International

export type IntlCorridor = {
  id: string;
  label: string;
  subtitle: string;
  feePct: number;
  feeMinNgn: number;
  settlementDays: string;
  countries: Array<{ code: string; name: string; currency: string; currencyName: string }>;
};

export type IntlQuote = {
  corridorId: string;
  corridorLabel: string;
  countryCode: string;
  countryName: string;
  currency: string;
  currencyName: string;
  amountNgn: number;
  feeNgn: number;
  totalDebitNgn: number;
  fxRate: number;
  amountForeign: number;
  settlementDays: string;
  settlementNote: string;
};

export async function apiIntlCorridors() {
  const res = await fetch(`${base}/api/v1/international/quote`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Corridors failed');
  return json.data as IntlCorridor[];
}

export async function apiIntlQuote(body: {
  corridorId: string;
  countryCode: string;
  amountNgn: number;
}) {
  const res = await fetch(`${base}/api/v1/international/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Quote failed');
  return json.data as IntlQuote;
}

export async function apiIntlTransfer(input: {
  userId: string;
  fromAccountId: string;
  corridorId: string;
  countryCode: string;
  amountNgn: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryBank?: string;
  note?: string;
  pin: string;
  idempotencyKey: string;
}) {
  const res = await fetch(`${base}/api/v1/international/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'International transfer failed');
  return json.data as {
    id: string;
    status: string;
    corridor: string;
    country: string;
    currency: string;
    amountNgn: number;
    feeNgn: number;
    totalDebitNgn: number;
    fxRate: number;
    amountForeign: number;
    beneficiaryName: string;
    settlementNote: string | null;
  };
}

export async function apiListIntlTransfers(userId: string) {
  const res = await fetch(
    `${base}/api/v1/international/transfers?userId=${encodeURIComponent(userId)}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'List failed');
  return json.data as Array<{
    id: string;
    status: string;
    corridor: string;
    country: string;
    currency: string;
    amountNgn: number;
    feeNgn: number;
    amountForeign: number;
    fxRate: number;
    beneficiaryName: string;
    createdAt: string;
  }>;
}
