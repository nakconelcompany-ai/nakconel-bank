const base = '';

export type Session = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  accountId?: string;
  accountNumber?: string;
  kycStatus?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

async function call<T>(res: Response): Promise<T> {
  const body = await res.text();
  let json: ApiResponse<T>;
  try { json = JSON.parse(body) as ApiResponse<T>; }
  catch {
    if (!res.ok) throw new Error(`Request failed (HTTP ${res.status}).`);
    throw new Error('The server returned an invalid response.');
  }
  if (!res.ok || !json.success) throw new Error(json.error || `Request failed (HTTP ${res.status}).`);
  return json.data as T;
}

/* ── Auth ── */
export async function apiRegister(body: {
  phone: string;
  fullName: string;
  email?: string;
  password: string;
  pin: string;
  bvn?: string;
  dateOfBirth?: string;
}) {
  const res = await fetch(`${base}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return call<Session>(res);
}

export async function apiLogin(phoneOrEmail: string, password: string) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: phoneOrEmail, password }),
  });
  return call<Session>(res);
}

export async function apiSession() {
  const res = await fetch('/api/v1/auth/session');
  return call<Session>(res);
}

export async function apiLogout() {
  const res = await fetch('/api/v1/auth/logout', { method: 'POST' });
  return call<{ success: boolean }>(res);
}

/* ── Balance ── */
export async function apiBalance(accountId: string) {
  const res = await fetch(`${base}/api/v1/accounts/balance?accountId=${encodeURIComponent(accountId)}`);
  return call<{
    accountId: string;
    balanceKobo: number;
    balance: number;
    formatted: string;
    currency: string;
  }>(res);
}

/* ── Transfers ── */
export type TxItem = {
  id: string;
  type: 'send' | 'receive' | 'topup';
  title: string;
  accountNumber?: string;
  amount: number;
  amountKobo: number;
  fee?: number;
  currency: string;
  status: string;
  note?: string;
  createdAt: string;
};

export async function apiTransfer(input: {
  fromAccountId: string;
  amount: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  bankCode?: string;
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
  return call<TxItem>(res);
}

export async function apiTransferHistory(accountId: string, cursor?: string) {
  const params = new URLSearchParams({ accountId, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${base}/api/v1/transfers?${params}`);
  return call<{ items: TxItem[]; hasMore: boolean; nextCursor: string | null }>(res);
}

/* ── Top-up ── */
export async function apiTopUp(accountId: string, amountNgn: number) {
  const res = await fetch(`${base}/api/v1/accounts/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, amountNgn }),
  });
  return call<{
    mode: 'paystack' | 'demo';
    authorizationUrl?: string;
    reference?: string;
    message?: string;
    amountKobo?: number;
  }>(res);
}

/* ── KYC ── */
export async function apiKycStatus() {
  const res = await fetch('/api/v1/kyc');
  return call<{
    kycStatus: string;
    latestSubmission: { id: string; status: string; idType: string; createdAt: string } | null;
  }>(res);
}

export async function apiKycSubmit(body: {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  bvn: string;
  idType: 'NIN' | 'PASSPORT' | 'DRIVERS_LICENCE' | 'VOTERS_CARD';
}) {
  const res = await fetch('/api/v1/kyc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return call<{ id: string; status: string; message: string }>(res);
}

/* ── Business ── */
export async function apiBizProfile(businessName?: string) {
  const res = await fetch('/api/v1/business/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName }),
  });
  return call<{ id: string; businessName: string }>(res);
}

export async function apiBizAnalytics() {
  const res = await fetch('/api/v1/business/analytics');
  return call<{
    businessName: string | null;
    totalCollected: number;
    totalExpenses: number;
    net: number;
    unpaidInvoices: number;
    unpaidAmount: number;
    activeLinks: number;
    teamCount: number;
    collectionCount: number;
  }>(res);
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
  return call<{ id: string; invoiceNumber: string }>(res);
}

export async function apiListInvoices() {
  const res = await fetch('/api/v1/business/invoices');
  return call<Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string | null;
    amount: number;
    status: string;
    createdAt: string;
  }>>(res);
}

export async function apiListPaymentLinks() {
  const res = await fetch('/api/v1/business/payment-links');
  return call<Array<{
    id: string;
    title: string;
    amount: number | null;
    status: string;
    collectCount: number;
  }>>(res);
}

export async function apiListCollections() {
  const res = await fetch('/api/v1/business/collections');
  return call<Array<{
    id: string;
    reference: string;
    amount: number;
    currency: string;
    source: string;
    payerName: string | null;
    status: string;
    createdAt: string;
  }>>(res);
}

export async function apiStartBusinessCollection(
  input: { source: 'INVOICE'; sourceId: string }
       | { source: 'DIRECT'; amount: number; payerName?: string; payerEmail: string }
) {
  const res = await fetch('/api/v1/business/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return call<{
    reference: string;
    authorizationUrl: string;
    amount: number;
    currency: string;
    status: string;
  }>(res);
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
  return call<{ id: string }>(res);
}

export async function apiListExpenses() {
  const res = await fetch('/api/v1/business/expenses');
  return call<Array<{ id: string; category: string; title: string; amount: number; spentAt: string }>>(res);
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
  return call<{ id: string }>(res);
}

export async function apiListTeam() {
  const res = await fetch('/api/v1/business/team');
  return call<Array<{ id: string; fullName: string; email: string; role: string; salary: number; status: string }>>(res);
}

/* ── International ── */
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
  return call<IntlCorridor[]>(res);
}

export async function apiIntlQuote(body: { corridorId: string; countryCode: string; amountNgn: number }) {
  const res = await fetch(`${base}/api/v1/international/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return call<IntlQuote>(res);
}

export async function apiIntlTransfer(input: {
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
  return call<{
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
    settlementNote: string | null;
  }>(res);
}

export async function apiListIntlTransfers() {
  const res = await fetch(`${base}/api/v1/international/transfers`);
  return call<Array<{
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
  }>>(res);
}

/* ── Email OTP ── */
export async function apiSendEmailOtp(email: string, purpose: 'signup' | 'password-reset', name?: string) {
  const res = await fetch('/api/v1/auth/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose, name }),
  });
  return call<{ sent: boolean }>(res);
}

export async function apiVerifyEmailOtp(email: string, code: string, purpose: 'signup' | 'password-reset') {
  const res = await fetch('/api/v1/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, purpose }),
  });
  return call<{ valid: boolean }>(res);
}

export async function apiResetPassword(email: string, code: string, newPassword: string) {
  const res = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  return call<Session & { passwordReset?: boolean }>(res);
}
